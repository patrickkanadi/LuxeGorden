// ==========================================
// PASTE YOUR GOOGLE WEB APP URL HERE!
// ==========================================
const API_URL = "https://script.google.com/macros/s/AKfycbyKUqD4vfQ1nRVLvxU_CXvKx2mtu-pWaPz43D1aYSea7QE3CwjS_BIJK2yRTWduukoM/exec"; 

// Global State
let masterData = { prices: [], customers: [], payables: [] };
let cart = [];
let cartTotals = { grandTotal: 0, totalModal: 0 };

// 1. Initialize App & Fetch Data
window.onload = async function() {
  document.getElementById('sysStatus').innerText = "Loading Master Data...";
  try {
    const response = await fetch(`${API_URL}?action=getAll`);
    masterData = await response.json();
    populateDropdowns();
    populateHutangTable();
    document.getElementById('sysStatus').style.display = 'none';
  } catch (err) {
    document.getElementById('sysStatus').innerText = "Failed to load database. Check API URL.";
    document.getElementById('sysStatus').style.background = "#e74c3c";
  }
};

// 2. Tab Navigation
function openTab(tabId) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-link').forEach(t => t.classList.remove('active'));
  document.getElementById(tabId).classList.add('active');
  event.target.classList.add('active');
}

// 3. UI Population
function populateDropdowns() {
  const custSelect = document.getElementById('posCustomerSelect');
  const fabricSelect = document.getElementById('mainFabric');
  
  masterData.customers.forEach(c => {
    custSelect.innerHTML += `<option value="${c.CustomerID}">${c.Name} (${c.Tier})</option>`;
  });
  
  masterData.prices.filter(p => p.Category === 'Fabric').forEach(p => {
    fabricSelect.innerHTML += `<option value="${p.ItemCode}">${p.ItemName}</option>`;
  });
}

function populateHutangTable() {
  const tbody = document.getElementById('hutangBody');
  masterData.payables.forEach(p => {
    tbody.innerHTML += `<tr><td>${new Date(p.Date).toLocaleDateString()}</td><td>${p.SupplierName}</td><td>${p.OrderID}</td><td>Rp ${p.AmountDue.toLocaleString()}</td><td>${p.Status}</td></tr>`;
  });
}

// 4. THE SMART BOM CALCULATOR
function addBOMToCart() {
  const custId = document.getElementById('posCustomerSelect').value;
  const fabricCode = document.getElementById('mainFabric').value;
  if (!custId || !fabricCode) return alert("Select Customer and Fabric!");

  const customer = masterData.customers.find(c => c.CustomerID === custId);
  const tier = customer.Tier; // e.g., 'Price_Reguler'
  
  const room = document.getElementById('roomName').value || "Unnamed Window";
  let w = Math.max(parseFloat(document.getElementById('width').value) || 1.0, 1.0);
  let h = Math.max(parseFloat(document.getElementById('height').value) || 1.0, 1.0);
  
  // Basic Fabric Calculation (Width +10cm, Height +25cm, 1.4m roll)
  let fabricQty = Math.ceil((w + 0.10) / 1.4) * (h + 0.25);
  
  // Build the BOM Array
  let componentsToAdd = [];
  
  // 1. Find and add Main Fabric
  const fabricObj = masterData.prices.find(p => p.ItemCode === fabricCode);
  componentsToAdd.push({ obj: fabricObj, qty: fabricQty, desc: `${fabricQty.toFixed(1)} m` });
  
  // 2. Add Rel (if checked) - Qty = Width
  if (document.getElementById('incRel').checked) {
    componentsToAdd.push({ obj: masterData.prices.find(p => p.ItemCode === 'A-REL'), qty: w, desc: `${w} m` });
  }
  
  // 3. Add Plong (if checked) - Estimate 12 rings per meter of width
  if (document.getElementById('incPlong').checked) {
    let rings = Math.ceil(w * 12);
    componentsToAdd.push({ obj: masterData.prices.find(p => p.ItemCode === 'A-PLONG'), qty: rings, desc: `${rings} pcs` });
  }
  
  // 4. Add Jahit (if checked) - Qty = Fabric Length
  if (document.getElementById('incJahit').checked) {
    componentsToAdd.push({ obj: masterData.prices.find(p => p.ItemCode === 'S-JAHIT'), qty: fabricQty, desc: `${fabricQty.toFixed(1)} m` });
  }

  // Process BOM into Cart
  componentsToAdd.forEach(comp => {
    if (!comp.obj) return; // Skip if item is missing from Master Data
    
    let sellPrice = comp.obj[tier] || 0; // Gets correct price for Customer's tier
    let baseCost = comp.obj.BaseCost_Modal || 0;
    
    cart.push({
      room: room,
      itemCode: comp.obj.ItemCode,
      itemName: comp.obj.ItemName,
      w: w, h: h,
      qty: comp.desc,
      baseCostTotal: (baseCost * comp.qty),
      subtotalPrice: (sellPrice * comp.qty),
      supplier: comp.obj.SupplierName
    });
  });

  updateCartUI();
}

function updateCartUI() {
  const tbody = document.getElementById('cartBody');
  tbody.innerHTML = "";
  cartTotals.grandTotal = 0;
  cartTotals.totalModal = 0;

  cart.forEach(item => {
    cartTotals.grandTotal += item.subtotalPrice;
    cartTotals.totalModal += item.baseCostTotal;
    tbody.innerHTML += `<tr>
      <td><b>${item.room}</b><br><small>${item.itemName}</small></td>
      <td>${item.qty}</td>
      <td>Rp ${item.subtotalPrice.toLocaleString()}</td>
    </tr>`;
  });

  document.getElementById('displayTotal').innerText = `Rp ${cartTotals.grandTotal.toLocaleString()}`;
  document.getElementById('displayModal').innerText = `Rp ${cartTotals.totalModal.toLocaleString()}`;
  document.getElementById('displayProfit').innerText = `Rp ${(cartTotals.grandTotal - cartTotals.totalModal).toLocaleString()}`;
}

// 5. SAVE DATA TO API
async function saveOrder() {
  if (cart.length === 0) return alert("Cart is empty!");
  const btn = document.getElementById('btnSave');
  btn.innerText = "Saving to Database..."; btn.disabled = true;

  const payload = {
    customerId: document.getElementById('posCustomerSelect').value,
    grandTotal: cartTotals.grandTotal,
    totalModal: cartTotals.totalModal,
    amountPaid: document.getElementById('amountPaid').value,
    status: document.getElementById('orderStatus').value,
    cartItems: cart
  };

  try {
    const res = await fetch(API_URL, { method: "POST", body: JSON.stringify({ action: "saveOrder", payload: payload }) });
    const data = await res.json();
    if (data.success) {
      alert("Order Saved! System generated Purchase Orders for Suppliers.");
      location.reload(); // Quick reset
    }
  } catch(e) { alert("Error Saving!"); }
}

async function saveCustomer() {
  const payload = {
    name: document.getElementById('newCustName').value,
    phone: document.getElementById('newCustWA').value,
    tier: document.getElementById('newCustTier').value,
    address: ""
  };
  const res = await fetch(API_URL, { method: "POST", body: JSON.stringify({ action: "addCustomer", payload: payload }) });
  const data = await res.json();
  if(data.success) { alert("Customer Saved!"); location.reload(); }
}
