// ==========================================
// PASTE YOUR GOOGLE WEB APP URL HERE!
// ==========================================
const API_URL = "https://script.google.com/macros/s/AKfycbyKUqD4vfQ1nRVLvxU_CXvKx2mtu-pWaPz43D1aYSea7QE3CwjS_BIJK2yRTWduukoM/exec"; 

let masterPrices = [];
let cart = [];
let cartTotals = { grandTotal: 0, totalModal: 0 };

// 1. Initialize App
window.onload = async function() {
  try {
    const response = await fetch(`${API_URL}?action=getMasterData`);
    const data = await response.json();
    masterPrices = data.prices;
    
    const fabricSelect = document.getElementById('mainFabric');
    fabricSelect.innerHTML = `<option value="">-- Select Fabric / Service --</option>`;
    
    masterPrices.filter(p => p.Category === 'Fabric' || p.Category === 'Service').forEach(p => {
      fabricSelect.innerHTML += `<option value="${p.ItemCode}">${p.ItemName}</option>`;
    });
    
    document.getElementById('sysStatus').style.display = 'none';
  } catch (err) {
    document.getElementById('sysStatus').innerText = "Failed to load database. Check API URL.";
    document.getElementById('sysStatus').style.background = "#e74c3c";
  }
};

// 2. Formatting Helper
function formatRupiah(number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(number);
}

// 3. Add to Summary (The BOM Calculator)
function addBOMToCart() {
  const fabricCode = document.getElementById('mainFabric').value;
  if (!fabricCode) return alert("Please select a Fabric or Service!");

  const tier = document.getElementById('custTier').value; 
  const room = document.getElementById('roomName').value || "Unnamed Window";
  let w = Math.max(parseFloat(document.getElementById('width').value) || 1.0, 1.0);
  let h = Math.max(parseFloat(document.getElementById('height').value) || 1.0, 1.0);
  let ukuranDesc = `L: ${w}m x T: ${h}m`;
  
  let fabricQty = Math.ceil((w + 0.10) / 1.4) * (h + 0.25);
  let componentsToAdd = [];
  
  // Main Fabric
  const fabricObj = masterPrices.find(p => p.ItemCode === fabricCode);
  componentsToAdd.push({ obj: fabricObj, qty: fabricQty, desc: `${fabricQty.toFixed(1)} m` });
  
  // Accessories
  if (document.getElementById('incRel').checked) {
    componentsToAdd.push({ obj: masterPrices.find(p => p.ItemCode === 'A-REL'), qty: w, desc: `${w} m` });
  }
  if (document.getElementById('incPlong').checked) {
    let rings = Math.ceil(w * 12);
    componentsToAdd.push({ obj: masterPrices.find(p => p.ItemCode === 'A-PLONG'), qty: rings, desc: `${rings} pcs` });
  }
  if (document.getElementById('incJahit').checked) {
    componentsToAdd.push({ obj: masterPrices.find(p => p.ItemCode === 'S-JAHIT'), qty: fabricQty, desc: `${fabricQty.toFixed(1)} m` });
  }

  // Push to Cart
  componentsToAdd.forEach(comp => {
    if (!comp.obj) return; 
    let sellPrice = parseFloat(comp.obj[tier]) || 0; 
    let baseCost = parseFloat(comp.obj.BaseCost_Modal) || 0;
    
    cart.push({
      room: room,
      ukuran: ukuranDesc,
      itemCode: comp.obj.ItemCode,
      itemName: comp.obj.ItemName,
      w: w, h: h,
      qtyDesc: comp.desc,
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

  cart.forEach((item, index) => {
    cartTotals.grandTotal += item.subtotalPrice;
    cartTotals.totalModal += item.baseCostTotal;
    tbody.innerHTML += `<tr>
      <td><b>${item.room}</b><br><small>${item.itemName}</small></td>
      <td>${item.ukuran}</td>
      <td>${item.qtyDesc}</td>
      <td>${formatRupiah(item.subtotalPrice)}</td>
      <td><button onclick="removeItem(${index})" style="background: #e74c3c; padding: 5px; width:auto;">X</button></td>
    </tr>`;
  });

  document.getElementById('displayTotal').innerText = formatRupiah(cartTotals.grandTotal);
}

function removeItem(index) {
  cart.splice(index, 1);
  updateCartUI();
}

// 4. Save Order to Database
async function saveOrder() {
  const custName = document.getElementById('custName').value.trim();
  const custWA = document.getElementById('custWA').value.trim();
  
  if (!custName) return alert("Customer Name is required!");
  if (cart.length === 0) return alert("Summary is empty!");
  
  const btn = document.getElementById('btnSave');
  btn.innerText = "Saving to Database..."; btn.disabled = true;

  const payload = {
    customerName: custName,
    customerWA: custWA,
    customerTier: document.getElementById('custTier').value,
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
      alert("Order successfully saved!");
      btn.innerText = "💾 Save Order to Database"; btn.disabled = false;
    }
  } catch(e) { 
    alert("Error Saving!"); 
    btn.innerText = "💾 Save Order to Database"; btn.disabled = false;
  }
}

// 5. PDF Generation (Proposal vs Invoice)
function generateDocument(docType) {
  const custName = document.getElementById('custName').value || "Customer Name";
  const custWA = document.getElementById('custWA').value || "-";
  const amountPaid = parseFloat(document.getElementById('amountPaid').value) || 0;
  
  // Fill Print Area
  document.getElementById('printDocType').innerText = docType;
  document.getElementById('printCustName').innerText = custName;
  document.getElementById('printCustWA').innerText = custWA;
  document.getElementById('printDate').innerText = new Date().toLocaleDateString('id-ID');
  
  const printBody = document.getElementById('printTableBody');
  printBody.innerHTML = "";
  
  cart.forEach(item => {
    printBody.innerHTML += `
      <tr style="border-bottom: 1px solid #ddd;">
        <td style="padding: 10px;"><b>${item.room}</b><br><span style="color:#555; font-size: 14px;">${item.itemName}</span></td>
        <td style="padding: 10px;">${item.qtyDesc}<br><span style="color:#555; font-size: 12px;">(${item.ukuran})</span></td>
        <td style="padding: 10px; text-align: right;">${formatRupiah(item.subtotalPrice)}</td>
      </tr>
    `;
  });

  document.getElementById('printGrandTotal').innerText = formatRupiah(cartTotals.grandTotal);
  
  // Hide DP/Sisa section if it's just a Proposal
  const paymentSection = document.getElementById('printPaymentSection');
  if (docType === 'Proposal') {
    paymentSection.style.display = 'none';
  } else {
    paymentSection.style.display = 'block';
    document.getElementById('printPaid').innerText = formatRupiah(amountPaid);
    document.getElementById('printSisa').innerText = formatRupiah(cartTotals.grandTotal - amountPaid);
  }

  // Trigger Browser Print Dialog
  window.print();
}
