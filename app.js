// PASTE YOUR SPECIFIC GOOGLE WEB APP URL HERE!
const API_URL = "https://script.google.com/macros/s/AKfycbyKUqD4vfQ1nRVLvxU_CXvKx2mtu-pWaPz43D1aYSea7QE3CwjS_BIJK2yRTWduukoM/exec"; 

let globalData = { prices: [], customers: [], orders: [], orderDetails: [] };
let cart = []; 
let cartTotals = { subTotal: 0, discount: 0, grandTotal: 0, totalModal: 0 };

window.onload = async function() {
  try {
    const response = await fetch(`${API_URL}?action=getAll`);
    globalData = await response.json();
    
    const fabricSelect = document.getElementById('mainFabric');
    globalData.prices.filter(p => p.Category === 'Fabric' || p.Category === 'Service').forEach(p => {
      fabricSelect.innerHTML += `<option value="${p.ItemCode}">${p.ItemName}</option>`;
    });

    renderCustomerList(); // Initial CRM render
    document.getElementById('sysStatus').style.display = 'none';
  } catch (err) {
    document.getElementById('sysStatus').innerText = "Failed to load database.";
  }
};

function switchTab(tabId) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-link').forEach(t => t.classList.remove('active'));
  document.getElementById(tabId).classList.add('active');
  event.target.classList.add('active');
}

function formatRupiah(number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(number);
}

// ==========================================
// CART, BOM ENGINE & DISCOUNT
// ==========================================
function addBOMToCart() {
  const fabricCode = document.getElementById('mainFabric').value;
  if (!fabricCode) return alert("Select Fabric!");

  const tier = document.getElementById('custTier').value; 
  const room = document.getElementById('roomName').value || "Unnamed Window";
  let w = Math.max(parseFloat(document.getElementById('width').value) || 1.0, 1.0);
  let h = Math.max(parseFloat(document.getElementById('height').value) || 1.0, 1.0);
  
  let fabricQty = Math.ceil((w + 0.10) / 1.4) * (h + 0.25);
  let comps = [];
  
  comps.push({ obj: globalData.prices.find(p => p.ItemCode === fabricCode), qty: fabricQty, desc: `${fabricQty.toFixed(1)} m` });
  if (document.getElementById('incRel').checked) comps.push({ obj: globalData.prices.find(p => p.ItemCode === 'A-REL'), qty: w, desc: `${w} m` });
  if (document.getElementById('incPlong').checked) comps.push({ obj: globalData.prices.find(p => p.ItemCode === 'A-PLONG'), qty: Math.ceil(w * 12), desc: `${Math.ceil(w * 12)} pcs` });
  if (document.getElementById('incJahit').checked) comps.push({ obj: globalData.prices.find(p => p.ItemCode === 'S-JAHIT'), qty: fabricQty, desc: `${fabricQty.toFixed(1)} m` });

  let windowObject = {
    roomId: Date.now(), 
    roomName: room,
    ukuran: `L:${w}m x T:${h}m`,
    w: w, h: h,
    components: []
  };

  comps.forEach(comp => {
    if (!comp.obj) return; 
    let sellPrice = comp.obj[tier] * comp.qty;
    windowObject.components.push({
      itemCode: comp.obj.ItemCode, itemName: comp.obj.ItemName,
      qtyDesc: comp.desc, baseCostTotal: (comp.obj.BaseCost_Modal * comp.qty),
      subtotalPrice: sellPrice, supplier: comp.obj.SupplierName
    });
  });

  cart.push(windowObject);
  updateCartUI();
}

function updateCartUI() {
  const tbody = document.getElementById('cartBody');
  tbody.innerHTML = "";
  cartTotals.subTotal = 0; cartTotals.totalModal = 0;

  cart.forEach((windowObj, index) => {
    let roomSubtotal = windowObj.components.reduce((sum, c) => sum + c.subtotalPrice, 0);
    
    tbody.innerHTML += `
      <tr class="room-header">
        <td colspan="2"><b>${windowObj.roomName}</b> (${windowObj.ukuran})</td>
        <td><b>${formatRupiah(roomSubtotal)}</b></td>
        <td><button onclick="removeWindow(${index})" style="background:#e74c3c; padding:5px 10px;">X</button></td>
      </tr>
    `;
    
    windowObj.components.forEach(c => {
      cartTotals.subTotal += c.subtotalPrice;
      cartTotals.totalModal += c.baseCostTotal;
      let displayPrice = c.subtotalPrice === 0 ? '<span style="color:green; font-weight:bold;">Included</span>' : formatRupiah(c.subtotalPrice);
      
      tbody.innerHTML += `
        <tr class="component-row">
          <td style="padding-left: 20px; color:#555;">- ${c.itemName}</td>
          <td>${c.qtyDesc}</td>
          <td>${displayPrice}</td><td></td>
        </tr>
      `;
    });
  });
  
  // Calculate Discounts
  let distType = document.getElementById('discountType').value;
  let distVal = parseFloat(document.getElementById('discountValue').value) || 0;
  cartTotals.discount = (distType === 'percent') ? (cartTotals.subTotal * (distVal / 100)) : distVal;
  cartTotals.grandTotal = cartTotals.subTotal - cartTotals.discount;

  document.getElementById('displaySubtotal').innerText = formatRupiah(cartTotals.subTotal);
  document.getElementById('displayTotal').innerText = formatRupiah(cartTotals.grandTotal);
}

function removeWindow(index) { cart.splice(index, 1); updateCartUI(); }

function clearCartAndOrder() {
  cart = []; document.getElementById('currentOrderId').value = "";
  document.getElementById('editAlert').hidden = true;
  document.getElementById('discountValue').value = 0;
  updateCartUI();
}

// ==========================================
// SAVE ORDERS
// ==========================================
async function saveOrder() {
  const custName = document.getElementById('custName').value.trim();
  if (!custName || cart.length === 0) return alert("Name & Cart are required!");
  
  const btn = document.getElementById('btnSave');
  btn.innerText = "Saving..."; btn.disabled = true;

  let flatCart = [];
  cart.forEach(w => { w.components.forEach(c => { flatCart.push({...c, room: w.roomName, w: w.w, h: w.h}); }); });

  const payload = {
    orderId: document.getElementById('currentOrderId').value,
    customerName: custName, customerWA: document.getElementById('custWA').value,
    customerAddress: document.getElementById('custAddress').value, customerTier: document.getElementById('custTier').value,
    subTotal: cartTotals.subTotal, discount: cartTotals.discount,
    grandTotal: cartTotals.grandTotal, totalModal: cartTotals.totalModal,
    amountPaid: document.getElementById('amountPaid').value, status: document.getElementById('orderStatus').value, 
    cartItems: flatCart
  };

  try {
    const res = await fetch(API_URL, { method: "POST", body: JSON.stringify({ action: "saveOrder", payload: payload }) });
    const data = await res.json();
    if (data.success) { alert("Order Saved!"); location.reload(); }
  } catch(e) { alert("Error!"); btn.innerText = "💾 Save / Update Order"; btn.disabled = false; }
}

// ==========================================
// CRM: SEARCH, SORT & VIEW
// ==========================================
function renderCustomerList() {
  const filterText = document.getElementById('crmSearch').value.toLowerCase();
  const listDiv = document.getElementById('crmCustomerList');
  listDiv.innerHTML = "";
  
  // Sort alphabetically
  let sorted = [...globalData.customers].sort((a,b) => a.Name.localeCompare(b.Name));
  
  // Filter by name or WA
  let filtered = sorted.filter(c => c.Name.toLowerCase().includes(filterText) || c.Phone_WA.includes(filterText));

  filtered.forEach(c => {
    listDiv.innerHTML += `
      <div class="crm-list-item" onclick="loadCustomerProfile('${c.CustomerID}')">
        <b>${c.Name}</b> <br><small style="color:#777;">${c.Phone_WA}</small>
      </div>`;
  });
}

function loadCustomerProfile(custId) {
  const customer = globalData.customers.find(c => c.CustomerID === custId);
  document.getElementById('editCustId').value = customer.CustomerID;
  document.getElementById('editCustName').value = customer.Name;
  document.getElementById('editCustWA').value = customer.Phone_WA;
  document.getElementById('editCustAddress').value = customer.Address || "";
  document.getElementById('editCustTier').value = customer.Tier;

  const custOrders = globalData.orders.filter(o => o.CustomerID === custId);
  const orderBody = document.getElementById('crmOrderHistory');
  orderBody.innerHTML = "";
  
  custOrders.forEach(o => {
    orderBody.innerHTML += `
      <tr>
        <td>${new Date(o.Date).toLocaleDateString()}</td>
        <td>${formatRupiah(o.GrandTotal)}</td>
        <td><b>${o.Status}</b></td>
        <td><button onclick="editOrderInPOS('${o.OrderID}', '${custId}')" style="background:#2980b9; padding:5px 10px;">Edit</button></td>
      </tr>`;
  });
  document.getElementById('crmProfile').style.display = 'block';
}

function editOrderInPOS(orderId, custId) {
  const customer = globalData.customers.find(c => c.CustomerID === custId);
  document.getElementById('custName').value = customer.Name;
  document.getElementById('custWA').value = customer.Phone_WA;
  document.getElementById('custAddress').value = customer.Address || "";
  document.getElementById('custTier').value = customer.Tier;

  const order = globalData.orders.find(o => o.OrderID === orderId);
  document.getElementById('orderStatus').value = order.Status;
  document.getElementById('amountPaid').value = order.AmountPaid;
  
  // Set Discount back to RP explicitly for reloading
  document.getElementById('discountType').value = 'rp';
  document.getElementById('discountValue').value = order.Discount || 0;

  cart = [];
  const details = globalData.orderDetails.filter(d => d.OrderID === orderId);
  
  let roomsMap = {};
  details.forEach(d => {
    if (!roomsMap[d.RoomName]) {
      roomsMap[d.RoomName] = {
        roomId: Date.now() + Math.random(), roomName: d.RoomName,
        w: d['Width(m)'], h: d['Height(m)'],
        ukuran: `L:${d['Width(m)']}m x T:${d['Height(m)']}m`, components: []
      };
    }
    roomsMap[d.RoomName].components.push({
      itemCode: d.ItemCode, itemName: d.ItemName, qtyDesc: d['Qty/Area'],
      baseCostTotal: parseFloat(d.BaseCostTotal), subtotalPrice: parseFloat(d.SubtotalPrice)
    });
  });

  cart = Object.values(roomsMap);
  
  document.getElementById('currentOrderId').value = orderId;
  document.getElementById('displayOrderId').innerText = orderId;
  document.getElementById('editAlert').hidden = false;
  
  updateCartUI();
  switchTab('tab-pos');
}

async function updateCustomerProfile() {
  const payload = {
    customerId: document.getElementById('editCustId').value,
    name: document.getElementById('editCustName').value,
    phone: document.getElementById('editCustWA').value,
    address: document.getElementById('editCustAddress').value,
    tier: document.getElementById('editCustTier').value
  };
  await fetch(API_URL, { method: "POST", body: JSON.stringify({ action: "updateCustomer", payload: payload }) });
  alert("Profile Updated!"); location.reload();
}

// ==========================================
// PRINTING ENGINE (Proposal vs Invoice)
// ==========================================
function generateDocument(docType) {
  document.getElementById('printDocType').innerText = (docType === 'Proposal') ? "PROPOSAL PENAWARAN" : "INVOICE / TAGIHAN";
  document.getElementById('printCustName').innerText = document.getElementById('custName').value;
  document.getElementById('printCustWA').innerText = document.getElementById('custWA').value;
  document.getElementById('printCustAddress').innerText = document.getElementById('custAddress').value;
  document.getElementById('printDate').innerText = new Date().toLocaleDateString('id-ID');
  
  const printBody = document.getElementById('printTableBody');
  printBody.innerHTML = "";
  
  cart.forEach(windowObj => {
    let roomSubtotal = windowObj.components.reduce((sum, c) => sum + c.subtotalPrice, 0);
    printBody.innerHTML += `<tr class="room-header"><td colspan="2"><b>${windowObj.roomName}</b> (${windowObj.ukuran})</td><td style="text-align:right;"><b>${formatRupiah(roomSubtotal)}</b></td></tr>`;
    windowObj.components.forEach(c => {
      let displayPrice = c.subtotalPrice === 0 ? 'Included' : formatRupiah(c.subtotalPrice);
      printBody.innerHTML += `<tr><td style="padding-left:20px;">- ${c.itemName}</td><td>${c.qtyDesc}</td><td style="text-align:right;">${displayPrice}</td></tr>`;
    });
  });

  document.getElementById('printSubtotal').innerText = formatRupiah(cartTotals.subTotal);
  document.getElementById('printDiscount').innerText = `- ${formatRupiah(cartTotals.discount)}`;
  document.getElementById('printGrandTotal').innerText = formatRupiah(cartTotals.grandTotal);
  
  const messageArea = document.getElementById('printMessageArea');
  if (docType === 'Proposal') {
    let dp50 = cartTotals.grandTotal / 2;
    messageArea.innerHTML = `
      <p style="margin:0; font-size: 16px;"><b>Catatan Proposal:</b></p>
      <ul style="margin:5px 0 0 0; font-size:14px;">
        <li>Harga pada proposal ini berlaku selama 7 hari.</li>
        <li>Untuk memulai proses produksi, mohon lakukan pembayaran <b>DP 50% sebesar ${formatRupiah(dp50)}</b>.</li>
        <li>Pembayaran dapat ditransfer ke BCA 7880xxxxx a/n Luxe Gorden.</li>
      </ul>
    `;
  } else {
    let paid = parseFloat(document.getElementById('amountPaid').value) || 0;
    let sisa = cartTotals.grandTotal - paid;
    messageArea.innerHTML = `
      <div style="display:flex; justify-content:space-between; font-size: 16px;">
        <div><b>Telah Dibayar (DP):</b><br>${formatRupiah(paid)}</div>
        <div style="text-align:right;"><b>SISA TAGIHAN:</b><br><span style="font-size:22px; color:#e74c3c;">${formatRupiah(sisa)}</span></div>
      </div>
    `;
  }
  
  window.print();
}
