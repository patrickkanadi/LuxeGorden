// PASTE YOUR SPECIFIC GOOGLE WEB APP URL HERE!
const API_URL = "https://script.google.com/macros/s/AKfycbyKUqD4vfQ1nRVLvxU_CXvKx2mtu-pWaPz43D1aYSea7QE3CwjS_BIJK2yRTWduukoM/exec"; 

let globalData = { prices: [], customers: [], orders: [], orderDetails: [] };
let cart = []; 
let cartTotals = { subTotal: 0, discount: 0, grandTotal: 0, totalModal: 0 };

window.onload = async function() {
  try {
    const response = await fetch(`${API_URL}?action=getAll`);
    globalData = await response.json();
    
    const kainSel = document.getElementById('kainFabric');
    const vitraseSel = document.getElementById('vitraseFabric');
    const rollerSel = document.getElementById('rollerFabric');
    
    // New Roman Selectors
    const romanFabSel = document.getElementById('romanFabric');
    const romanLinSel = document.getElementById('romanLining');
    const romanMechSel = document.getElementById('romanMech');
    const romanLabSel = document.getElementById('romanLabor');
    
    globalData.prices.forEach(p => {
      if(p.Category === 'Fabric') {
        kainSel.innerHTML += `<option value="${p.ItemCode}">${p.ItemName}</option>`;
        vitraseSel.innerHTML += `<option value="${p.ItemCode}">${p.ItemName}</option>`;
        romanFabSel.innerHTML += `<option value="${p.ItemCode}">${p.ItemName}</option>`;
      }
      if(p.Category === 'Vitrase') vitraseSel.innerHTML += `<option value="${p.ItemCode}">${p.ItemName}</option>`;
      if(p.Category === 'Roller') rollerSel.innerHTML += `<option value="${p.ItemCode}">${p.ItemName}</option>`;
      
      // Look for specific Roman parts (Requires them to be in your Database!)
      if(p.ItemCode.includes('FURING')) romanLinSel.innerHTML += `<option value="${p.ItemCode}">${p.ItemName}</option>`;
      if(p.ItemCode.includes('ROMAN-MECH')) romanMechSel.innerHTML += `<option value="${p.ItemCode}">${p.ItemName}</option>`;
      if(p.ItemCode.includes('ROMAN-JAHIT')) romanLabSel.innerHTML += `<option value="${p.ItemCode}">${p.ItemName}</option>`;
    });

    renderCustomerList();
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

function toggleLayers() {
  document.getElementById('configKain').style.display = document.getElementById('layerKain').checked ? 'block' : 'none';
  document.getElementById('configVitrase').style.display = document.getElementById('layerVitrase').checked ? 'block' : 'none';
  document.getElementById('configRoller').style.display = document.getElementById('layerRoller').checked ? 'block' : 'none';
  document.getElementById('configRoman').style.display = document.getElementById('layerRoman').checked ? 'block' : 'none';
}

function formatRupiah(number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(number);
}

// ==========================================
// MODULAR CART & BOM ENGINE (With Fullness & Layer Grouping)
// ==========================================
function addBOMToCart() {
  const room = document.getElementById('roomName').value || "Unnamed Window";
  let frameW = Math.max(parseFloat(document.getElementById('width').value) || 1.0, 1.0);
  let frameH = Math.max(parseFloat(document.getElementById('height').value) || 1.0, 1.0);
  const tier = document.getElementById('custTier').value; 
  
  let comps = [];
  let summaryDesc = [];

  // Helper Function for Fabric Math (Accepts Dynamic Fullness)
  function calculateFabric(w, h, fullness) {
    let curtainW = w + 0.10;
    let curtainH = h + 0.15; // Frame + 15cm
    let qty = 0;
    
    if (curtainH <= 2.80) {
      qty = w * fullness; // Uses dropdown fullness (2.0, 2.3, or 1.8)
    } else {
      let rawPanels = curtainW / 1.40;
      let panels = Math.ceil(rawPanels * 2) / 2;
      qty = panels * curtainH; 
    }
    return Math.round(qty * 100) / 100;
  }

  // --- 1. KAIN LAYER ---
  if (document.getElementById('layerKain').checked) {
    let fabricCode = document.getElementById('kainFabric').value;
    let model = document.getElementById('kainModel').value;
    let railCode = document.getElementById('kainRail').value;
    let fullness = parseFloat(document.getElementById('kainFullness').value);
    if(!fabricCode) return alert("Select Kain Fabric!");
    
    let baseQty = calculateFabric(frameW, frameH, fullness);
    let fabricObj = globalData.prices.find(p => p.ItemCode === fabricCode);
    let lType = `Gorden Kain (${model})`;
    
    comps.push({ layer: lType, obj: fabricObj, qty: baseQty, desc: `${baseQty} m` });
    comps.push({ layer: lType, obj: fabricObj, qty: 0.25, desc: `0.25 m`, customName: `Tali Ikat (${fabricObj.ItemName})` });
    comps.push({ layer: lType, obj: globalData.prices.find(p => p.ItemCode === 'S-JAHIT'), qty: baseQty, desc: `${baseQty} m` });
    if(railCode !== 'none') comps.push({ layer: lType, obj: globalData.prices.find(p => p.ItemCode === railCode), qty: frameW + 0.10, desc: `${(frameW + 0.10).toFixed(2)} m` });
    if(model === 'Plong') comps.push({ layer: lType, obj: globalData.prices.find(p => p.ItemCode === 'A-PLONG'), qty: Math.ceil(baseQty * 9), desc: `${Math.ceil(baseQty * 9)} pcs` });
    
    summaryDesc.push(`Kain`);
  }

  // --- 2. VITRASE LAYER ---
  if (document.getElementById('layerVitrase').checked) {
    let fabricCode = document.getElementById('vitraseFabric').value;
    let railCode = document.getElementById('vitraseRail').value;
    let fullness = parseFloat(document.getElementById('vitraseFullness').value);
    if(!fabricCode) return alert("Select Vitrase Fabric!");
    
    let baseQty = calculateFabric(frameW, frameH, fullness);
    let lType = 'Vitrase';
    
    comps.push({ layer: lType, obj: globalData.prices.find(p => p.ItemCode === fabricCode), qty: baseQty, desc: `${baseQty} m` });
    comps.push({ layer: lType, obj: globalData.prices.find(p => p.ItemCode === 'S-JAHIT'), qty: baseQty, desc: `${baseQty} m` });
    if(railCode !== 'none') comps.push({ layer: lType, obj: globalData.prices.find(p => p.ItemCode === railCode), qty: frameW + 0.10, desc: `${(frameW + 0.10).toFixed(2)} m` });
    
    summaryDesc.push(`Vitrase`);
  }

  // --- 3. ROLLER BLIND LAYER ---
  if (document.getElementById('layerRoller').checked) {
    let fabricCode = document.getElementById('rollerFabric').value;
    if(!fabricCode) return alert("Select Roller Blind!");
    
    // Rule: Area is Width x Height, but MINIMUM is 1.0 m2
    let area = Math.max((frameW * frameH), 1.0);
    
    comps.push({ layer: 'Roller Blind', obj: globalData.prices.find(p => p.ItemCode === fabricCode), qty: area, desc: `${area.toFixed(2)} m2` });
    summaryDesc.push(`Roller Blind`);
  }
  
  // --- 4. ROMAN SHADE LAYER ---
  if (document.getElementById('layerRoman').checked) {
    let fabricCode = document.getElementById('romanFabric').value;
    let mechCode = document.getElementById('romanMech').value;
    let laborCode = document.getElementById('romanLabor').value;
    let incLining = document.getElementById('incRomanLining').checked;
    let liningCode = document.getElementById('romanLining').value;

    if(!fabricCode || !mechCode || !laborCode || (incLining && !liningCode)) return alert("Please complete all Roman Shade dropdowns!");

    // Rule: Frame + 25cm for Width and Height
    let rWidth = frameW + 0.25;
    let rHeight = frameH + 0.25;
    let rArea = rWidth * rHeight; // Used for Labor (m2)
    
    let fabricQty = 0;
    let maxHoriz = 2.80 - 0.15; // 2.65m max height for horizontal

    // Flat Fabric Logic (No 2.0x multiplier)
    if (rHeight <= maxHoriz) {
      fabricQty = rWidth; // Horizontal cut
    } else {
      let panels = Math.ceil((rWidth / 1.40) * 2) / 2;
      fabricQty = panels * rHeight; // Vertical cut
    }
    fabricQty = Math.round(fabricQty * 100) / 100;

    let lType = 'Roman Shade';

    // 1. Main Fabric (m)
    comps.push({ layer: lType, obj: globalData.prices.find(p => p.ItemCode === fabricCode), qty: fabricQty, desc: `${fabricQty} m` });

    // 2. Lining Fabric (m) (Optional)
    if (incLining) {
      comps.push({ layer: lType, obj: globalData.prices.find(p => p.ItemCode === liningCode), qty: fabricQty, desc: `${fabricQty} m`, customName: `Furing / Lining` });
    }

    // 3. Roman Mechanism (m of Width)
    comps.push({ layer: lType, obj: globalData.prices.find(p => p.ItemCode === mechCode), qty: rWidth, desc: `${rWidth.toFixed(2)} m` });

    // 4. Sewing Labor (m2 of Area)
    comps.push({ layer: lType, obj: globalData.prices.find(p => p.ItemCode === laborCode), qty: rArea, desc: `${rArea.toFixed(2)} m2` });

    summaryDesc.push(`Roman Shade`);
  }

  if (comps.length === 0) return alert("Please check at least one layer to add!");

  let windowObject = {
    roomId: Date.now(), roomName: room,
    ukuran: `L:${frameW}m x T:${frameH}m [${summaryDesc.join(' + ')}]`,
    w: frameW, h: frameH, components: []
  };

  comps.forEach(comp => {
    if (!comp.obj) return; 
    windowObject.components.push({
      layer: comp.layer, // Store the group layer
      itemCode: comp.obj.ItemCode, itemName: comp.customName || comp.obj.ItemName,
      qtyDesc: comp.desc, baseCostTotal: (comp.obj.BaseCost_Modal * comp.qty),
      subtotalPrice: (comp.obj[tier] * comp.qty), supplier: comp.obj.SupplierName
    });
  });

  cart.push(windowObject);
  updateCartUI();
  
  // Reset Toggles
  document.querySelectorAll('input[type="checkbox"][id^="layer"]').forEach(cb => cb.checked = false);
  toggleLayers();
}

// ==========================================
// RENDER CART WITH LAYER GROUPING
// ==========================================
function updateCartUI() {
  const tbody = document.getElementById('cartBody');
  tbody.innerHTML = "";
  cartTotals.subTotal = 0; cartTotals.totalModal = 0;

  cart.forEach((windowObj, index) => {
    let roomSubtotal = windowObj.components.reduce((sum, c) => sum + c.subtotalPrice, 0);
    
    // Main Room Header
    tbody.innerHTML += `
      <tr class="room-header">
        <td colspan="2"><b style="font-size:16px;">${windowObj.roomName}</b> <span style="color:#555; font-size:12px;">(${windowObj.ukuran})</span></td>
        <td><b>${formatRupiah(roomSubtotal)}</b></td>
        <td><button onclick="removeWindow(${index})" style="background:#e74c3c; padding:5px 10px;">X</button></td>
      </tr>
    `;
    
    // Group Components by Layer
    let layers = {};
    windowObj.components.forEach(c => {
      if(!layers[c.layer]) layers[c.layer] = [];
      layers[c.layer].push(c);
    });

    // Render Each Layer Group
    Object.keys(layers).forEach(layerName => {
      tbody.innerHTML += `<tr><td colspan="4" style="background:#f1f2f6; font-size:12px; font-weight:bold; color:#2c3e50; padding:4px 10px;">➔ ${layerName}</td></tr>`;
      
      layers[layerName].forEach(c => {
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
  });
  
  // Recalculate Totals
  let distType = document.getElementById('discountType').value;
  let distVal = parseFloat(document.getElementById('discountValue').value) || 0;
  cartTotals.discount = (distType === 'percent') ? (cartTotals.subTotal * (distVal / 100)) : distVal;
  cartTotals.grandTotal = cartTotals.subTotal - cartTotals.discount;

  document.getElementById('displaySubtotal').innerText = formatRupiah(cartTotals.subTotal);
  document.getElementById('displayTotal').innerText = formatRupiah(cartTotals.grandTotal);
}

// ==========================================
// PRINTING ENGINE (Grouped by Layer)
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
    printBody.innerHTML += `<tr class="room-header"><td colspan="2"><b style="font-size:16px;">${windowObj.roomName}</b> <span style="font-size:12px; font-weight:normal;">(${windowObj.ukuran})</span></td><td style="text-align:right;"><b>${formatRupiah(roomSubtotal)}</b></td></tr>`;
    
    let layers = {};
    windowObj.components.forEach(c => {
      if(!layers[c.layer]) layers[c.layer] = [];
      layers[c.layer].push(c);
    });

    Object.keys(layers).forEach(layerName => {
      printBody.innerHTML += `<tr><td colspan="3" style="font-size:12px; font-weight:bold; color:#555; padding: 4px 10px; background:#f9f9f9; border-top:1px dashed #ccc;">➔ ${layerName}</td></tr>`;
      layers[layerName].forEach(c => {
        let displayPrice = c.subtotalPrice === 0 ? 'Included' : formatRupiah(c.subtotalPrice);
        printBody.innerHTML += `<tr><td style="padding-left:20px;">- ${c.itemName}</td><td>${c.qtyDesc}</td><td style="text-align:right;">${displayPrice}</td></tr>`;
      });
    });
  });

  document.getElementById('printSubtotal').innerText = formatRupiah(cartTotals.subTotal);
  document.getElementById('printDiscount').innerText = `- ${formatRupiah(cartTotals.discount)}`;
  document.getElementById('printGrandTotal').innerText = formatRupiah(cartTotals.grandTotal);
  
  const messageArea = document.getElementById('printMessageArea');
  if (docType === 'Proposal') {
    let dp50 = cartTotals.grandTotal / 2;
    messageArea.innerHTML = `<p style="margin:0;"><b>Catatan:</b> Untuk memulai produksi, mohon pembayaran DP 50% sebesar <b>${formatRupiah(dp50)}</b>.</p>`;
  } else {
    let paid = parseFloat(document.getElementById('amountPaid').value) || 0;
    messageArea.innerHTML = `<div style="display:flex; justify-content:space-between; font-size:16px;"><div><b>Telah Dibayar:</b><br>${formatRupiah(paid)}</div><div style="text-align:right;"><b>SISA TAGIHAN:</b><br><span style="font-size:22px;">${formatRupiah(cartTotals.grandTotal - paid)}</span></div></div>`;
  }
  
  window.print();
}

function removeWindow(index) { cart.splice(index, 1); updateCartUI(); }

function clearCartAndOrder() {
  // 1. Clear Cart & IDs
  cart = []; 
  document.getElementById('currentOrderId').value = "";
  document.getElementById('editAlert').hidden = true;
  document.getElementById('discountValue').value = 0;
  
  // 2. Clear Customer Details
  document.getElementById('custName').value = "";
  document.getElementById('custWA').value = "";
  document.getElementById('custAddress').value = "";
  document.getElementById('custTier').value = "Price_Reguler";
  
  // 3. Clear Window Details
  document.getElementById('roomName').value = "";
  document.getElementById('width').value = "1.0";
  document.getElementById('height').value = "1.0";
  document.getElementById('mainFabric').value = "";
  document.getElementById('incRel').checked = true;
  document.getElementById('incPlong').checked = true;
  document.getElementById('incJahit').checked = true;
  
  // 4. Clear Payment Info
  document.getElementById('orderStatus').value = "Draft";
  document.getElementById('amountPaid').value = "0";

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
        <td style="display: flex; gap: 5px;">
          <button onclick="editOrderInPOS('${o.OrderID}', '${custId}')" style="background:#2980b9; padding:5px 10px;">Edit</button>
          <button onclick="deleteOrderPermanently('${o.OrderID}')" style="background:#e74c3c; padding:5px 10px;">Delete</button>
        </td>
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
// DELETE ORDER
// ==========================================
async function deleteOrderPermanently(orderId) {
  const isConfirmed = confirm(`Are you sure you want to permanently delete order ${orderId}? This cannot be undone.`);
  if (!isConfirmed) return;

  try {
    const res = await fetch(API_URL, { 
      method: "POST", 
      body: JSON.stringify({ action: "deleteOrder", payload: { orderId: orderId } }) 
    });
    const data = await res.json();
    
    if (data.success) {
      alert("Order successfully deleted!");
      location.reload(); // Refresh the page to update the CRM list
    } else {
      alert("Error deleting order: " + data.error);
    }
  } catch(e) { 
    alert("Network Error!"); 
  }
}

