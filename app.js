// YOUR SPECIFIC GOOGLE WEB APP URL
const API_URL = "https://script.google.com/macros/s/AKfycbyKUqD4vfQ1nRVLvxU_CXvKx2mtu-pWaPz43D1aYSea7QE3CwjS_BIJK2yRTWduukoM/exec"; 

let globalData = { prices: [], customers: [], orders: [], orderDetails: [] };
let cart = []; // Cart now stores Window Objects containing Components
let cartTotals = { grandTotal: 0, totalModal: 0 };

window.onload = async function() {
  try {
    const response = await fetch(`${API_URL}?action=getAll`);
    globalData = await response.json();
    
    const fabricSelect = document.getElementById('mainFabric');
    globalData.prices.filter(p => p.Category === 'Fabric' || p.Category === 'Service').forEach(p => {
      fabricSelect.innerHTML += `<option value="${p.ItemCode}">${p.ItemName}</option>`;
    });

    const crmSelect = document.getElementById('crmCustomerSelect');
    globalData.customers.forEach(c => {
      crmSelect.innerHTML += `<option value="${c.CustomerID}">${c.Name} (${c.Phone_WA})</option>`;
    });
    
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
// CART & BOM ENGINE (Nested Structure)
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
    roomId: Date.now(), // unique ID for deletion
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
  cartTotals.grandTotal = 0; cartTotals.totalModal = 0;

  cart.forEach((windowObj, index) => {
    // Render Room Header Row
    tbody.innerHTML += `
      <tr class="room-header">
        <td colspan="3"><b>${windowObj.roomName}</b> (${windowObj.ukuran})</td>
        <td><button onclick="removeWindow(${index})" style="background:#e74c3c; padding:5px 10px;">Delete</button></td>
      </tr>
    `;
    
    // Render Components under Room
    windowObj.components.forEach(c => {
      cartTotals.grandTotal += c.subtotalPrice;
      cartTotals.totalModal += c.baseCostTotal;
      let displayPrice = c.subtotalPrice === 0 ? '<span style="color:green; font-weight:bold;">Included</span>' : formatRupiah(c.subtotalPrice);
      
      tbody.innerHTML += `
        <tr class="component-row">
          <td style="padding-left: 20px; color:#555;">- ${c.itemName}</td>
          <td>${c.qtyDesc}</td>
          <td>${displayPrice}</td>
          <td></td>
        </tr>
      `;
    });
  });
  
  document.getElementById('displayTotal').innerText = formatRupiah(cartTotals.grandTotal);
}

function removeWindow(index) { cart.splice(index, 1); updateCartUI(); }

function clearCartAndOrder() {
  cart = []; document.getElementById('currentOrderId').value = "";
  document.getElementById('editAlert').hidden = true;
  updateCartUI();
}

// ==========================================
// SAVE & EDIT ORDERS
// ==========================================
async function saveOrder() {
  const custName = document.getElementById('custName').value.trim();
  if (!custName || cart.length === 0) return alert("Name & Cart are required!");
  
  const btn = document.getElementById('btnSave');
  btn.innerText = "Saving..."; btn.disabled = true;

  // Flatten Cart for Backend Database (Order_Details)
  let flatCart = [];
  cart.forEach(w => {
    w.components.forEach(c => {
      flatCart.push({...c, room: w.roomName, w: w.w, h: w.h});
    });
  });

  const payload = {
    orderId: document.getElementById('currentOrderId').value,
    customerName: custName, customerWA: document.getElementById('custWA').value,
    customerAddress: document.getElementById('custAddress').value, customerTier: document.getElementById('custTier').value,
    grandTotal: cartTotals.grandTotal, totalModal: cartTotals.totalModal,
    amountPaid: document.getElementById('amountPaid').value, status: document.getElementById('orderStatus').value, 
    cartItems: flatCart
  };

  try {
    const res = await fetch(API_URL, { method: "POST", body: JSON.stringify({ action: "saveOrder", payload: payload }) });
    const data = await res.json();
    if (data.success) { alert("Order Saved Successfully!"); location.reload(); }
  } catch(e) { alert("Error!"); btn.innerText = "💾 Save / Update Order"; btn.disabled = false; }
}

// ==========================================
// CRM: VIEW AND EDIT LOGIC
// ==========================================
function loadCustomerProfile() {
  const custId = document.getElementById('crmCustomerSelect').value;
  if (!custId) return document.getElementById('crmProfile').style.display = 'none';

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
        <td>${o.OrderID}</td>
        <td>${new Date(o.Date).toLocaleDateString()}</td>
        <td>${formatRupiah(o.GrandTotal)}</td>
        <td><b>${o.Status}</b></td>
        <td><button onclick="editOrderInPOS('${o.OrderID}', '${custId}')" style="background:#2980b9; padding:8px;">View & Edit in POS</button></td>
      </tr>
    `;
  });
  document.getElementById('crmProfile').style.display = 'block';
}

function editOrderInPOS(orderId, custId) {
  // 1. Populate Customer Data
  const customer = globalData.customers.find(c => c.CustomerID === custId);
  document.getElementById('custName').value = customer.Name;
  document.getElementById('custWA').value = customer.Phone_WA;
  document.getElementById('custAddress').value = customer.Address || "";
  document.getElementById('custTier').value = customer.Tier;

  const order = globalData.orders.find(o => o.OrderID === orderId);
  document.getElementById('orderStatus').value = order.Status;
  document.getElementById('amountPaid').value = order.AmountPaid;

  // 2. Rebuild Cart Nested Structure from flat Order_Details
  cart = [];
  const details = globalData.orderDetails.filter(d => d.OrderID === orderId);
  
  // Group by Room Name
  let roomsMap = {};
  details.forEach(d => {
    if (!roomsMap[d.RoomName]) {
      roomsMap[d.RoomName] = {
        roomId: Date.now() + Math.random(),
        roomName: d.RoomName,
        w: d['Width(m)'], h: d['Height(m)'],
        ukuran: `L:${d['Width(m)']}m x T:${d['Height(m)']}m`,
        components: []
      };
    }
    roomsMap[d.RoomName].components.push({
      itemCode: d.ItemCode, itemName: d.ItemName, qtyDesc: d['Qty/Area'],
      baseCostTotal: parseFloat(d.BaseCostTotal), subtotalPrice: parseFloat(d.SubtotalPrice)
    });
  });

  cart = Object.values(roomsMap);
  
  // 3. Switch Tab and Set Editing State
  document.getElementById('currentOrderId').value = orderId;
  document.getElementById('displayOrderId').innerText = orderId;
  document.getElementById('editAlert').hidden = false;
  
  updateCartUI();
  
  // Click the POS tab programmatically
  document.querySelectorAll('.tab-link')[0].click();
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
// PRINTING ENGINE (Uses Nested Layout)
// ==========================================
function generateDocument(docType) {
  document.getElementById('printDocType').innerText = docType;
  document.getElementById('printCustName').innerText = document.getElementById('custName').value;
  document.getElementById('printCustWA').innerText = document.getElementById('custWA').value;
  document.getElementById('printDate').innerText = new Date().toLocaleDateString('id-ID');
  
  const printBody = document.getElementById('printTableBody');
  printBody.innerHTML = "";
  
  cart.forEach(windowObj => {
    printBody.innerHTML += `<tr class="room-header"><td colspan="3"><b>${windowObj.roomName}</b> (${windowObj.ukuran})</td></tr>`;
    windowObj.components.forEach(c => {
      let displayPrice = c.subtotalPrice === 0 ? 'Included' : formatRupiah(c.subtotalPrice);
      printBody.innerHTML += `<tr><td style="padding-left:20px;">- ${c.itemName}</td><td>${c.qtyDesc}</td><td style="text-align:right;">${displayPrice}</td></tr>`;
    });
  });

  document.getElementById('printGrandTotal').innerText = formatRupiah(cartTotals.grandTotal);
  
  let paid = parseFloat(document.getElementById('amountPaid').value) || 0;
  if (docType === 'Proposal') {
    document.getElementById('printPaymentSection').style.display = 'none';
  } else {
    document.getElementById('printPaymentSection').style.display = 'block';
    document.getElementById('printPaid').innerText = formatRupiah(paid);
    document.getElementById('printSisa').innerText = formatRupiah(cartTotals.grandTotal - paid);
  }
  
  window.print();
}
