// YOUR SPECIFIC GOOGLE WEB APP URL
const API_URL = "https://script.google.com/macros/s/AKfycbyKUqD4vfQ1nRVLvxU_CXvKx2mtu-pWaPz43D1aYSea7QE3CwjS_BIJK2yRTWduukoM/exec"; 

let globalData = { prices: [], customers: [], orders: [] };
let cart = [];
let cartTotals = { grandTotal: 0, totalModal: 0 };

// 1. Initialize & Fetch Data
window.onload = async function() {
  try {
    const response = await fetch(`${API_URL}?action=getAll`);
    globalData = await response.json();
    
    // Fill Fabric Dropdown
    const fabricSelect = document.getElementById('mainFabric');
    globalData.prices.filter(p => p.Category === 'Fabric' || p.Category === 'Service').forEach(p => {
      fabricSelect.innerHTML += `<option value="${p.ItemCode}">${p.ItemName}</option>`;
    });

    // Fill CRM Customer Dropdown
    const crmSelect = document.getElementById('crmCustomerSelect');
    globalData.customers.forEach(c => {
      crmSelect.innerHTML += `<option value="${c.CustomerID}">${c.Name} (${c.Phone_WA})</option>`;
    });
    
    document.getElementById('sysStatus').style.display = 'none';
  } catch (err) {
    document.getElementById('sysStatus').innerText = "Failed to load database. Check API URL.";
  }
};

// 2. Tab Navigation
function switchTab(tabId) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-link').forEach(t => t.classList.remove('active'));
  document.getElementById(tabId).classList.add('active');
  event.target.classList.add('active');
}

function formatRupiah(number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(number);
}

// 3. POS: Add to Cart
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

  comps.forEach(comp => {
    if (!comp.obj) return; 
    cart.push({
      room: room, ukuran: `L:${w} x T:${h}`, itemCode: comp.obj.ItemCode, itemName: comp.obj.ItemName,
      w: w, h: h, qtyDesc: comp.desc, baseCostTotal: (comp.obj.BaseCost_Modal * comp.qty),
      subtotalPrice: (comp.obj[tier] * comp.qty), supplier: comp.obj.SupplierName
    });
  });
  updateCartUI();
}

function updateCartUI() {
  const tbody = document.getElementById('cartBody');
  tbody.innerHTML = "";
  cartTotals.grandTotal = 0; cartTotals.totalModal = 0;

  cart.forEach((item, index) => {
    cartTotals.grandTotal += item.subtotalPrice;
    cartTotals.totalModal += item.baseCostTotal;
    tbody.innerHTML += `<tr>
      <td><b>${item.room}</b><br><small>${item.itemName}</small></td>
      <td>${item.ukuran}</td>
      <td>${formatRupiah(item.subtotalPrice)}</td>
      <td><button onclick="removeItem(${index})" style="background:#e74c3c; padding:5px;">X</button></td>
    </tr>`;
  });
  document.getElementById('displayTotal').innerText = formatRupiah(cartTotals.grandTotal);
}

function removeItem(index) { cart.splice(index, 1); updateCartUI(); }

// 4. POS: Save Order
async function saveOrder() {
  const custName = document.getElementById('custName').value.trim();
  if (!custName || cart.length === 0) return alert("Name & Cart are required!");
  
  const btn = document.getElementById('btnSave');
  btn.innerText = "Saving..."; btn.disabled = true;

  const payload = {
    customerName: custName, customerWA: document.getElementById('custWA').value,
    customerAddress: document.getElementById('custAddress').value, customerTier: document.getElementById('custTier').value,
    grandTotal: cartTotals.grandTotal, totalModal: cartTotals.totalModal,
    amountPaid: document.getElementById('amountPaid').value, status: document.getElementById('orderStatus').value, cartItems: cart
  };

  try {
    const res = await fetch(API_URL, { method: "POST", body: JSON.stringify({ action: "saveOrder", payload: payload }) });
    const data = await res.json();
    if (data.success) { alert("Saved!"); location.reload(); }
  } catch(e) { alert("Error!"); btn.innerText = "💾 Save Order"; btn.disabled = false; }
}

// 5. CRM: Load Customer & Orders
function loadCustomerProfile() {
  const custId = document.getElementById('crmCustomerSelect').value;
  if (!custId) return document.getElementById('crmProfile').style.display = 'none';

  const customer = globalData.customers.find(c => c.CustomerID === custId);
  document.getElementById('editCustId').value = customer.CustomerID;
  document.getElementById('editCustName').value = customer.Name;
  document.getElementById('editCustWA').value = customer.Phone_WA;
  document.getElementById('editCustAddress').value = customer.Address || "";
  document.getElementById('editCustTier').value = customer.Tier;

  // Filter Orders for this customer
  const custOrders = globalData.orders.filter(o => o.CustomerID === custId);
  const orderBody = document.getElementById('crmOrderHistory');
  orderBody.innerHTML = "";
  
  custOrders.forEach(o => {
    orderBody.innerHTML += `
      <tr>
        <td>${o.OrderID}</td>
        <td>${new Date(o.Date).toLocaleDateString()}</td>
        <td>${formatRupiah(o.GrandTotal)}</td>
        <td><input type="number" id="pay_${o.OrderID}" value="${o.AmountPaid}" style="width:100px;"></td>
        <td>
          <select id="stat_${o.OrderID}">
            <option value="Draft" ${o.Status==='Draft'?'selected':''}>Draft</option>
            <option value="DP" ${o.Status==='DP'?'selected':''}>DP</option>
            <option value="Lunas" ${o.Status==='Lunas'?'selected':''}>Lunas</option>
          </select>
        </td>
        <td><button onclick="updateOrderState('${o.OrderID}')" style="background:#27ae60; padding:8px;">Save</button></td>
      </tr>
    `;
  });
  document.getElementById('crmProfile').style.display = 'block';
}

// 6. CRM: Edit Customer Profile
async function updateCustomerProfile() {
  const payload = {
    customerId: document.getElementById('editCustId').value,
    name: document.getElementById('editCustName').value,
    phone: document.getElementById('editCustWA').value,
    address: document.getElementById('editCustAddress').value,
    tier: document.getElementById('editCustTier').value
  };
  await fetch(API_URL, { method: "POST", body: JSON.stringify({ action: "updateCustomer", payload: payload }) });
  alert("Profile Updated!");
}

// 7. CRM: Update Order Payment/Status
async function updateOrderState(orderId) {
  const payload = {
    orderId: orderId,
    amountPaid: document.getElementById(`pay_${orderId}`).value,
    status: document.getElementById(`stat_${orderId}`).value
  };
  await fetch(API_URL, { method: "POST", body: JSON.stringify({ action: "updateOrder", payload: payload }) });
  alert("Order Updated!");
}

// 8. PDF Printing
function generateDocument(docType) {
  document.getElementById('printDocType').innerText = docType;
  document.getElementById('printCustName').innerText = document.getElementById('custName').value;
  document.getElementById('printDate').innerText = new Date().toLocaleDateString('id-ID');
  
  const printBody = document.getElementById('printTableBody');
  printBody.innerHTML = "";
  cart.forEach(item => {
    printBody.innerHTML += `<tr><td style="padding:10px;"><b>${item.room}</b><br><small>${item.itemName}</small></td><td style="padding:10px;">${item.qtyDesc} (${item.ukuran})</td><td style="text-align:right;">${formatRupiah(item.subtotalPrice)}</td></tr>`;
  });
  document.getElementById('printGrandTotal').innerText = formatRupiah(cartTotals.grandTotal);
  window.print();
}
