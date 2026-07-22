// PASTE YOUR SPECIFIC GOOGLE WEB APP URL HERE!
const API_URL = "https://script.google.com/macros/s/AKfycbyKUqD4vfQ1nRVLvxU_CXvKx2mtu-pWaPz43D1aYSea7QE3CwjS_BIJK2yRTWduukoM/exec"; 

let globalData = { prices: [], customers: [], orders: [], orderDetails: [] };
let cart = []; 
let cartTotals = { subTotal: 0, discount: 0, grandTotal: 0, totalModal: 0 };
let editingWindowId = null; // Tracks which window is currently being edited

window.onload = async function() {
  try {
    const response = await fetch(`${API_URL}?action=getAll`);
    globalData = await response.json();
    
    const kainSel = document.getElementById('kainFabric');
    const vitraseSel = document.getElementById('vitraseFabric');
    const rollerSel = document.getElementById('rollerFabric');
    const romanFabSel = document.getElementById('romanFabric');
    const romanLinSel = document.getElementById('romanLining');
    const romanMechSel = document.getElementById('romanMech');
    const romanLabSel = document.getElementById('romanLabor');
    
    globalData.prices.forEach(p => {
      if(p.Category === 'Fabric') { kainSel.innerHTML += `<option value="${p.ItemCode}">${p.ItemName}</option>`; vitraseSel.innerHTML += `<option value="${p.ItemCode}">${p.ItemName}</option>`; romanFabSel.innerHTML += `<option value="${p.ItemCode}">${p.ItemName}</option>`; }
      if(p.Category === 'Vitrase') vitraseSel.innerHTML += `<option value="${p.ItemCode}">${p.ItemName}</option>`;
      if(p.Category === 'Roller') rollerSel.innerHTML += `<option value="${p.ItemCode}">${p.ItemName}</option>`;
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

function formatRupiah(number) { return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(number); }

function toggleLayers() {
  document.getElementById('configKain').style.display = document.getElementById('layerKain').checked ? 'block' : 'none';
  document.getElementById('configVitrase').style.display = document.getElementById('layerVitrase').checked ? 'block' : 'none';
  document.getElementById('configRoller').style.display = document.getElementById('layerRoller').checked ? 'block' : 'none';
  document.getElementById('configRoman').style.display = document.getElementById('layerRoman').checked ? 'block' : 'none';
  document.getElementById('configCuci').style.display = document.getElementById('layerCuci').checked ? 'block' : 'none';
}

function promptAdminAccess() {
  const pin = prompt("Enter Master PIN:");
  
  // Find PIN in globalData.settings (defaults to "8888" if missing)
  const pinSetting = globalData.settings && globalData.settings.find(s => s.Key === 'Master_PIN');
  const masterPin = pinSetting ? pinSetting.Value.toString() : "8888";

  if (pin === masterPin) {
    renderAnalysis();
    renderPayables();
    document.querySelectorAll('.tab-link').forEach(t => t.classList.remove('active'));
    document.getElementById('tab-analysis').classList.add('active'); // Shows first admin tab
    
    // Add dynamic buttons if they don't exist yet
    if(!document.getElementById('btnAnalysisTab')) {
      document.querySelector('.navbar').innerHTML += `<button id="btnAnalysisTab" class="tab-link active" onclick="switchTab('tab-analysis')">📊 Analysis</button><button id="btnPayablesTab" class="tab-link" onclick="switchTab('tab-payables')">💸 Payables</button>`;
    } else {
      switchTab('tab-analysis');
    }
  } else {
    alert("Incorrect PIN.");
  }
}
// ==========================================
// BOM ENGINE & WINDOW EDITING
// ==========================================
function addBOMToCart() {
  const room = document.getElementById('roomName').value || "Unnamed Window";
  let frameW = Math.max(parseFloat(document.getElementById('width').value) || 1.0, 1.0);
  let frameH = Math.max(parseFloat(document.getElementById('height').value) || 1.0, 1.0);
  const tier = document.getElementById('custTier').value; 
  
  let comps = [];
  let summaryDesc = [];

  // Capture Raw Configuration for later Editing
  let rawConfig = {
    roomName: room, width: frameW, height: frameH,
    layerKain: document.getElementById('layerKain').checked, kainFabric: document.getElementById('kainFabric').value, kainModel: document.getElementById('kainModel').value, kainFullness: document.getElementById('kainFullness').value, kainRail: document.getElementById('kainRail').value,
    layerVitrase: document.getElementById('layerVitrase').checked, vitraseFabric: document.getElementById('vitraseFabric').value, vitraseFullness: document.getElementById('vitraseFullness').value, vitraseRail: document.getElementById('vitraseRail').value,
    layerRoller: document.getElementById('layerRoller').checked, rollerFabric: document.getElementById('rollerFabric').value,
    layerRoman: document.getElementById('layerRoman').checked, romanFabric: document.getElementById('romanFabric').value, incRomanLining: document.getElementById('incRomanLining').checked, romanLining: document.getElementById('romanLining').value, romanMech: document.getElementById('romanMech').value, romanLabor: document.getElementById('romanLabor').value
  };

  function calculateFabric(w, h, fullness) {
    let curtainW = w + 0.10;
    let curtainH = h + 0.15; 
    let qty = (curtainH <= 2.80) ? (w * fullness) : (Math.ceil((curtainW / 1.40) * 2) / 2) * curtainH;
    return Number(qty.toFixed(1)); // 1 DECIMAL PLACE ROUNDING
  }

  // --- CUCI LAYER (Add this below Roman Shade block) ---
  if (document.getElementById('layerCuci').checked) {
    let cuciCode = document.getElementById('cuciService').value;
    let area = Number((frameW * frameH).toFixed(1)); // 1 DECIMAL PLACE
    comps.push({ layer: 'Jasa Cuci', obj: globalData.prices.find(p => p.ItemCode === cuciCode), qty: area, desc: `${area.toFixed(1)} m2` });
    summaryDesc.push(`Cuci`);
  }

  // --- KAIN ---
  if (rawConfig.layerKain) {
    if(!rawConfig.kainFabric) return alert("Select Kain Fabric!");
    let baseQty = calculateFabric(frameW, frameH, parseFloat(rawConfig.kainFullness));
    let fObj = globalData.prices.find(p => p.ItemCode === rawConfig.kainFabric);
    comps.push({ layer: `Gorden Kain (${rawConfig.kainModel})`, obj: fObj, qty: baseQty, desc: `${baseQty} m` });
    comps.push({ layer: `Gorden Kain (${rawConfig.kainModel})`, obj: fObj, qty: 0.25, desc: `0.25 m`, customName: `Tali Ikat (${fObj.ItemName})` });
    comps.push({ layer: `Gorden Kain (${rawConfig.kainModel})`, obj: globalData.prices.find(p => p.ItemCode === 'S-JAHIT'), qty: baseQty, desc: `${baseQty} m` });
    if(rawConfig.kainRail !== 'none') comps.push({ layer: `Gorden Kain (${rawConfig.kainModel})`, obj: globalData.prices.find(p => p.ItemCode === rawConfig.kainRail), qty: frameW + 0.10, desc: `${(frameW + 0.10).toFixed(2)} m` });
    if(rawConfig.kainModel === 'Plong') comps.push({ layer: `Gorden Kain (${rawConfig.kainModel})`, obj: globalData.prices.find(p => p.ItemCode === 'A-PLONG'), qty: Math.ceil(baseQty * 9), desc: `${Math.ceil(baseQty * 9)} pcs` });
    summaryDesc.push(`Kain`);
  }

  // --- VITRASE ---
  if (rawConfig.layerVitrase) {
    if(!rawConfig.vitraseFabric) return alert("Select Vitrase Fabric!");
    let baseQty = calculateFabric(frameW, frameH, parseFloat(rawConfig.vitraseFullness));
    comps.push({ layer: 'Vitrase', obj: globalData.prices.find(p => p.ItemCode === rawConfig.vitraseFabric), qty: baseQty, desc: `${baseQty} m` });
    comps.push({ layer: 'Vitrase', obj: globalData.prices.find(p => p.ItemCode === 'S-JAHIT'), qty: baseQty, desc: `${baseQty} m` });
    if(rawConfig.vitraseRail !== 'none') comps.push({ layer: 'Vitrase', obj: globalData.prices.find(p => p.ItemCode === rawConfig.vitraseRail), qty: frameW + 0.10, desc: `${(frameW + 0.10).toFixed(2)} m` });
    summaryDesc.push(`Vitrase`);
  }

  // --- ROLLER BLIND ---
  if (rawConfig.layerRoller) {
    if(!rawConfig.rollerFabric) return alert("Select Roller Blind!");
    let area = Math.max((frameW * frameH), 1.0);
    comps.push({ layer: 'Roller Blind', obj: globalData.prices.find(p => p.ItemCode === rawConfig.rollerFabric), qty: area, desc: `${area.toFixed(2)} m2` });
    summaryDesc.push(`Roller Blind`);
  }
  
  // --- ROMAN SHADE ---
  if (rawConfig.layerRoman) {
    if(!rawConfig.romanFabric || !rawConfig.romanMech || !rawConfig.romanLabor || (rawConfig.incRomanLining && !rawConfig.romanLining)) return alert("Complete Roman Dropdowns!");
    let rW = frameW + 0.25; let rH = frameH + 0.25;
    let fabricQty = (rH <= 2.65) ? rW : (Math.ceil((rW / 1.40) * 2) / 2) * rH;
    fabricQty = Math.round(fabricQty * 100) / 100;
    
    comps.push({ layer: 'Roman Shade', obj: globalData.prices.find(p => p.ItemCode === rawConfig.romanFabric), qty: fabricQty, desc: `${fabricQty} m` });
    if (rawConfig.incRomanLining) comps.push({ layer: 'Roman Shade', obj: globalData.prices.find(p => p.ItemCode === rawConfig.romanLining), qty: fabricQty, desc: `${fabricQty} m`, customName: `Furing / Lining` });
    comps.push({ layer: 'Roman Shade', obj: globalData.prices.find(p => p.ItemCode === rawConfig.romanMech), qty: rW, desc: `${rW.toFixed(2)} m` });
    comps.push({ layer: 'Roman Shade', obj: globalData.prices.find(p => p.ItemCode === rawConfig.romanLabor), qty: (rW * rH), desc: `${(rW * rH).toFixed(2)} m2` });
    summaryDesc.push(`Roman Shade`);
  }

  if (comps.length === 0) return alert("Check at least one layer!");

  let windowObject = {
    roomId: editingWindowId || Date.now(), // Use existing ID if editing
    roomName: room, ukuran: `L:${frameW}m x T:${frameH}m [${summaryDesc.join(' + ')}]`,
    w: frameW, h: frameH, components: [], rawConfig: rawConfig // Saved!
  };

  comps.forEach(comp => {
    if (!comp.obj) return; 
    windowObject.components.push({
      layer: comp.layer, itemCode: comp.obj.ItemCode, itemName: comp.customName || comp.obj.ItemName,
      qtyDesc: comp.desc, baseCostTotal: (comp.obj.BaseCost_Modal * comp.qty),
      subtotalPrice: (comp.obj[tier] * comp.qty), supplier: comp.obj.SupplierName
    });
  });

  if (editingWindowId) {
    let idx = cart.findIndex(w => w.roomId === editingWindowId);
    if (idx > -1) cart[idx] = windowObject; // Update existing
    editingWindowId = null;
    let btn = document.getElementById('btnAddUpdateWindow');
    btn.innerText = "+ Add Window to Order"; btn.style.background = "#2980b9";
  } else {
    cart.push(windowObject); // Add new
  }

  updateCartUI();
  
  // Clean up Form
  document.querySelectorAll('input[type="checkbox"][id^="layer"]').forEach(cb => cb.checked = false);
  toggleLayers();
}

// Loads a window back into the form for editing
function editWindow(roomId) {
  let win = cart.find(w => w.roomId === roomId);
  if (!win) return;
  let cfg = win.rawConfig;

  document.getElementById('roomName').value = cfg.roomName;
  document.getElementById('width').value = cfg.width;
  document.getElementById('height').value = cfg.height;

  document.getElementById('layerKain').checked = cfg.layerKain;
  document.getElementById('kainFabric').value = cfg.kainFabric || "";
  document.getElementById('kainModel').value = cfg.kainModel || "Biasa";
  document.getElementById('kainFullness').value = cfg.kainFullness || "2.0";
  document.getElementById('kainRail').value = cfg.kainRail || "A-REL";

  document.getElementById('layerVitrase').checked = cfg.layerVitrase;
  document.getElementById('vitraseFabric').value = cfg.vitraseFabric || "";
  document.getElementById('vitraseFullness').value = cfg.vitraseFullness || "2.0";
  document.getElementById('vitraseRail').value = cfg.vitraseRail || "A-REL";

  document.getElementById('layerRoller').checked = cfg.layerRoller;
  document.getElementById('rollerFabric').value = cfg.rollerFabric || "";

  document.getElementById('layerRoman').checked = cfg.layerRoman;
  document.getElementById('romanFabric').value = cfg.romanFabric || "";
  document.getElementById('incRomanLining').checked = cfg.incRomanLining;
  document.getElementById('romanLiningDiv').style.display = cfg.incRomanLining ? 'block' : 'none';
  document.getElementById('romanLining').value = cfg.romanLining || "";
  document.getElementById('romanMech').value = cfg.romanMech || "";
  document.getElementById('romanLabor').value = cfg.romanLabor || "";

  toggleLayers();

  editingWindowId = roomId;
  let btn = document.getElementById('btnAddUpdateWindow');
  btn.innerText = "💾 Update Window";
  btn.style.background = "#f39c12";

  document.getElementById('roomName').scrollIntoView({behavior: "smooth", block: "center"});
}

function updateCartUI() {
  const tbody = document.getElementById('cartBody');
  tbody.innerHTML = "";
  cartTotals.subTotal = 0; cartTotals.totalModal = 0;

  cart.forEach((windowObj, index) => {
    let roomSubtotal = windowObj.components.reduce((sum, c) => sum + c.subtotalPrice, 0);
    
    // NEW: Edit Button added next to Delete
    tbody.innerHTML += `
      <tr class="room-header">
        <td colspan="2"><b style="font-size:16px;">${windowObj.roomName}</b> <span style="color:#555; font-size:12px;">(${windowObj.ukuran})</span></td>
        <td><b>${formatRupiah(roomSubtotal)}</b></td>
        <td>
          <button onclick="editWindow(${windowObj.roomId})" style="background:#f39c12; padding:5px 10px; margin-right:5px; width:auto;">Edit</button>
          <button onclick="removeWindow(${index})" style="background:#e74c3c; padding:5px 10px; width:auto;">X</button>
        </td>
      </tr>
    `;
    
    let layers = {};
    windowObj.components.forEach(c => {
      if(!layers[c.layer]) layers[c.layer] = [];
      layers[c.layer].push(c);
    });

    Object.keys(layers).forEach(layerName => {
      tbody.innerHTML += `<tr><td colspan="4" style="background:#f1f2f6; font-size:12px; font-weight:bold; color:#2c3e50; padding:4px 10px;">➔ ${layerName}</td></tr>`;
      layers[layerName].forEach(c => {
        cartTotals.subTotal += c.subtotalPrice; cartTotals.totalModal += c.baseCostTotal;
        let displayPrice = c.subtotalPrice === 0 ? '<span style="color:green; font-weight:bold;">Included</span>' : formatRupiah(c.subtotalPrice);
        tbody.innerHTML += `<tr class="component-row"><td style="padding-left: 20px; color:#555;">- ${c.itemName}</td><td>${c.qtyDesc}</td><td>${displayPrice}</td><td></td></tr>`;
      });
    });
  });
  
  let distType = document.getElementById('discountType').value;
  let distVal = parseFloat(document.getElementById('discountValue').value) || 0;
  cartTotals.discount = (distType === 'percent') ? (cartTotals.subTotal * (distVal / 100)) : distVal;
  cartTotals.grandTotal = cartTotals.subTotal - cartTotals.discount;

  document.getElementById('displaySubtotal').innerText = formatRupiah(cartTotals.subTotal);
  document.getElementById('displayTotal').innerText = formatRupiah(cartTotals.grandTotal);
}

function removeWindow(index) { cart.splice(index, 1); updateCartUI(); }

function clearCartAndOrder() {
  cart = []; document.getElementById('currentOrderId').value = ""; document.getElementById('editAlert').hidden = true; document.getElementById('discountValue').value = 0;
  document.getElementById('custName').value = ""; document.getElementById('custWA').value = ""; document.getElementById('custAddress').value = ""; document.getElementById('custTier').value = "Price_Reguler";
  document.getElementById('roomName').value = ""; document.getElementById('width').value = "1.0"; document.getElementById('height').value = "1.0";
  document.getElementById('orderStatus').value = "Draft"; document.getElementById('amountPaid').value = "0";
  
  // Clear editing state if user cancels
  editingWindowId = null;
  let btn = document.getElementById('btnAddUpdateWindow');
  btn.innerText = "+ Add Window to Order"; btn.style.background = "#2980b9";
  
  updateCartUI();
}

async function saveOrder() {
  const custName = document.getElementById('custName').value.trim();
  if (!custName || cart.length === 0) return alert("Name & Cart are required!");
  const btn = document.getElementById('btnSave'); btn.innerText = "Saving..."; btn.disabled = true;

  let flatCart = [];
  cart.forEach(w => { w.components.forEach(c => { flatCart.push({...c, room: w.roomName, w: w.w, h: w.h}); }); });

  const payload = {
    orderId: document.getElementById('currentOrderId').value, customerName: custName, customerWA: document.getElementById('custWA').value,
    customerAddress: document.getElementById('custAddress').value, customerTier: document.getElementById('custTier').value,
    subTotal: cartTotals.subTotal, discount: cartTotals.discount, grandTotal: cartTotals.grandTotal, totalModal: cartTotals.totalModal,
    amountPaid: document.getElementById('amountPaid').value, status: document.getElementById('orderStatus').value, cartItems: flatCart
  };

  try {
    const res = await fetch(API_URL, { method: "POST", body: JSON.stringify({ action: "saveOrder", payload: payload }) });
    const data = await res.json();
    if (data.success) { alert("Order Saved!"); location.reload(); }
  } catch(e) { alert("Error!"); btn.innerText = "💾 Save / Update Order"; btn.disabled = false; }
}

function renderCustomerList() {
  const filterText = document.getElementById('crmSearch').value.toLowerCase();
  const listDiv = document.getElementById('crmCustomerList'); 
  listDiv.innerHTML = "";
  
  // Set up datalist for Autocomplete
  let datalistHTML = `<datalist id="custOptions">`;
  globalData.customers.forEach(c => {
    datalistHTML += `<option value="${c.Name} - ${c.Phone_WA}">`;
  });
  datalistHTML += `</datalist>`;
  document.getElementById('crmSearch').setAttribute('list', 'custOptions');
  if(!document.getElementById('custOptions')) document.body.insertAdjacentHTML('beforeend', datalistHTML);

  let sorted = [...globalData.customers].sort((a,b) => a.Name.localeCompare(b.Name));
  let filtered = sorted.filter(c => c.Name.toLowerCase().includes(filterText) || c.Phone_WA.includes(filterText));
  filtered.forEach(c => { listDiv.innerHTML += `<div class="crm-list-item" onclick="loadCustomerProfile('${c.CustomerID}')"><b>${c.Name}</b> <br><small style="color:#777;">${c.Phone_WA}</small></div>`; });
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
  
  // Container wrapper for scrollable table
  document.getElementById('crmOrderHistory').parentElement.style.display = "block";
  document.getElementById('crmOrderHistory').parentElement.style.maxHeight = "300px";
  document.getElementById('crmOrderHistory').parentElement.style.overflowY = "auto";

  custOrders.forEach(o => {
    // Get Items in Order
    let items = globalData.orderDetails.filter(d => d.OrderID === o.OrderID).map(d => d.RoomName).filter((v, i, a) => a.indexOf(v) === i).join(', ');
    
    orderBody.innerHTML += `<tr>
      <td><b>${o.OrderID}</b><br><span style="color:#777;">${new Date(o.Date).toLocaleDateString()}</span></td>
      <td><span style="font-size:10px;">${items || "No items"}</span></td>
      <td>${formatRupiah(o.GrandTotal)}</td>
      <td><b>${o.Status}</b></td>
      <td style="display:flex; gap:5px;"><button onclick="editOrderInPOS('${o.OrderID}', '${custId}')" style="background:#2980b9; padding:5px;">Edit</button>
      <button onclick="deleteOrderPermanently('${o.OrderID}')" style="background:#e74c3c; padding:5px;">Del</button></td></tr>`;
  });
  document.getElementById('crmProfile').style.display = 'block';
}

function editOrderInPOS(orderId, custId) {
  const customer = globalData.customers.find(c => c.CustomerID === custId);
  document.getElementById('custName').value = customer.Name; document.getElementById('custWA').value = customer.Phone_WA; document.getElementById('custAddress').value = customer.Address || ""; document.getElementById('custTier').value = customer.Tier;
  const order = globalData.orders.find(o => o.OrderID === orderId);
  document.getElementById('orderStatus').value = order.Status; document.getElementById('amountPaid').value = order.AmountPaid;
  document.getElementById('discountType').value = 'rp'; document.getElementById('discountValue').value = order.Discount || 0;

  cart = [];
  const details = globalData.orderDetails.filter(d => d.OrderID === orderId);
  let roomsMap = {};
  
  // Rebuilding Cart. NOTE: Orders saved BEFORE this update will not have "rawConfig" saved, 
  // so they cannot be natively edited using the new "Edit Window" button, but they CAN be deleted or appended to!
  details.forEach(d => {
    if (!roomsMap[d.RoomName]) roomsMap[d.RoomName] = { roomId: Date.now() + Math.random(), roomName: d.RoomName, w: d['Width(m)'], h: d['Height(m)'], ukuran: `L:${d['Width(m)']}m x T:${d['Height(m)']}m`, components: [], rawConfig: {} };
    roomsMap[d.RoomName].components.push({ layer: "Imported from CRM", itemCode: d.ItemCode, itemName: d.ItemName, qtyDesc: d['Qty/Area'], baseCostTotal: parseFloat(d.BaseCostTotal), subtotalPrice: parseFloat(d.SubtotalPrice) });
  });

  cart = Object.values(roomsMap);
  document.getElementById('currentOrderId').value = orderId; document.getElementById('displayOrderId').innerText = orderId; document.getElementById('editAlert').hidden = false;
  
  updateCartUI(); switchTab('tab-pos');
}

async function updateCustomerProfile() {
  const payload = { customerId: document.getElementById('editCustId').value, name: document.getElementById('editCustName').value, phone: document.getElementById('editCustWA').value, address: document.getElementById('editCustAddress').value, tier: document.getElementById('editCustTier').value };
  await fetch(API_URL, { method: "POST", body: JSON.stringify({ action: "updateCustomer", payload: payload }) });
  alert("Profile Updated!"); location.reload();
}

async function deleteOrderPermanently(orderId) {
  if (!confirm(`Permanently delete order ${orderId}?`)) return;
  try {
    const res = await fetch(API_URL, { method: "POST", body: JSON.stringify({ action: "deleteOrder", payload: { orderId: orderId } }) });
    const data = await res.json();
    if (data.success) { alert("Deleted!"); location.reload(); }
  } catch(e) { alert("Error!"); }
}

// ==========================================
// PIUTANG, ANALYSIS & PAYABLES LOGIC
// ==========================================
function renderPiutang() {
  const tbody = document.getElementById('piutangBody');
  tbody.innerHTML = "";
  
  const searchText = (document.getElementById('piutangSearch').value || "").toLowerCase();
  const sortType = document.getElementById('piutangSort').value;

  // 1. Filter: Only get unpaid orders
  let unpaidOrders = globalData.orders.filter(o => o.Status !== 'Lunas' && o.AmountPaid < o.GrandTotal && o.GrandTotal > 0);
  
  // 2. Map customer names & remaining debt to the object for easy sorting/searching
  unpaidOrders = unpaidOrders.map(o => {
    let cust = globalData.customers.find(c => c.CustomerID === o.CustomerID);
    o.customerName = cust ? cust.Name : 'Unknown';
    o.sisaTagihan = o.GrandTotal - o.AmountPaid;
    return o;
  });

  // 3. Apply Search Filter
  if (searchText) {
    unpaidOrders = unpaidOrders.filter(o => 
      o.customerName.toLowerCase().includes(searchText) || 
      o.OrderID.toLowerCase().includes(searchText)
    );
  }

  // 4. Apply Sort
  unpaidOrders.sort((a, b) => {
    if (sortType === 'date_desc') return new Date(b.Date) - new Date(a.Date);
    if (sortType === 'date_asc') return new Date(a.Date) - new Date(b.Date);
    if (sortType === 'sisa_desc') return b.sisaTagihan - a.sisaTagihan;
    if (sortType === 'sisa_asc') return a.sisaTagihan - b.sisaTagihan;
    return 0;
  });
  
  // 5. Render
  unpaidOrders.forEach(o => {
    tbody.innerHTML += `<tr>
      <td>${o.OrderID}</td><td>${new Date(o.Date).toLocaleDateString()}</td>
      <td>${o.customerName}</td><td>${formatRupiah(o.GrandTotal)}</td>
      <td>${formatRupiah(o.AmountPaid)}</td><td style="color:#e74c3c; font-weight:bold;">${formatRupiah(o.sisaTagihan)}</td>
      <td><button onclick="switchTab('tab-crm'); document.getElementById('crmSearch').value='${o.customerName}'; renderCustomerList();" style="background:#f39c12; padding:5px;">View in CRM</button></td>
    </tr>`;
    let custName = cust ? cust.Name : 'Unknown';
    let sisa = o.GrandTotal - o.AmountPaid;
    
    tbody.innerHTML += `<tr>
      <td>${o.OrderID}</td><td>${new Date(o.Date).toLocaleDateString()}</td>
      <td>${custName}</td><td>${formatRupiah(o.GrandTotal)}</td>
      <td>${formatRupiah(o.AmountPaid)}</td><td style="color:#e74c3c; font-weight:bold;">${formatRupiah(sisa)}</td>
      <td><button onclick="switchTab('tab-crm'); document.getElementById('crmSearch').value='${custName}'; renderCustomerList();" style="background:#f39c12; padding:5px;">View in CRM</button></td>
    </tr>`;
  });
}

function renderAnalysis() {
  const tbody = document.getElementById('analysisBody');
  tbody.innerHTML = "";
  let sortedOrders = [...globalData.orders].sort((a,b) => new Date(b.Date) - new Date(a.Date)); // Newest first
  
  sortedOrders.forEach(o => {
    let margin = o.GrandTotal > 0 ? ((o.NetProfit / o.GrandTotal) * 100).toFixed(1) : 0;
    tbody.innerHTML += `<tr>
      <td>${o.OrderID}</td><td>${new Date(o.Date).toLocaleDateString()}</td>
      <td>${formatRupiah(o.GrandTotal)}</td><td>${formatRupiah(o.TotalModal_COGS)}</td>
      <td style="color:green; font-weight:bold;">${formatRupiah(o.NetProfit)}</td>
      <td>${margin}%</td>
    </tr>`;
  });
}

function renderPayables() {
  const tbody = document.getElementById('payablesBody');
  tbody.innerHTML = "";
  let totalHutang = 0;
  
  globalData.payables.forEach(p => {
    let sisaHutang = p.AmountDue - p.AmountPaid;
    if (sisaHutang > 0) totalHutang += sisaHutang;
    
    tbody.innerHTML += `<tr>
      <td>${p.PayableID}</td><td>${new Date(p.Date).toLocaleDateString()}</td>
      <td>${p.SupplierName}</td><td>${p.OrderID}</td>
      <td>${formatRupiah(p.AmountDue)}</td>
      <td><input type="number" id="pay_${p.PayableID}" value="${p.AmountPaid}" style="width:100px;"></td>
      <td><select id="stat_${p.PayableID}"><option value="Unpaid" ${p.Status==='Unpaid'?'selected':''}>Unpaid</option><option value="Paid" ${p.Status==='Paid'?'selected':''}>Paid</option></select></td>
      <td><button onclick="savePayable('${p.PayableID}')" style="background:#27ae60; padding:5px;">Update</button></td>
    </tr>`;
  });
  
  document.getElementById('totalHutang').innerText = formatRupiah(totalHutang);
}

async function savePayable(payableId) {
  const payload = {
    payableId: payableId,
    amountPaid: document.getElementById(`pay_${payableId}`).value,
    status: document.getElementById(`stat_${payableId}`).value
  };
  await fetch(API_URL, { method: "POST", body: JSON.stringify({ action: "updatePayable", payload: payload }) });
  alert("Payable Updated!"); location.reload();
}

function generateDocument(docType) {
  document.getElementById('printDocType').innerText = (docType === 'Proposal') ? "PROPOSAL PENAWARAN" : "INVOICE / TAGIHAN";
  document.getElementById('printCustName').innerText = document.getElementById('custName').value; document.getElementById('printCustWA').innerText = document.getElementById('custWA').value; document.getElementById('printCustAddress').innerText = document.getElementById('custAddress').value; document.getElementById('printDate').innerText = new Date().toLocaleDateString('id-ID');
  
  const printBody = document.getElementById('printTableBody'); printBody.innerHTML = "";
  cart.forEach(windowObj => {
    let roomSubtotal = windowObj.components.reduce((sum, c) => sum + c.subtotalPrice, 0);
    printBody.innerHTML += `<tr class="room-header"><td colspan="2"><b style="font-size:16px;">${windowObj.roomName}</b> <span style="font-size:12px; font-weight:normal;">(${windowObj.ukuran})</span></td><td style="text-align:right;"><b>${formatRupiah(roomSubtotal)}</b></td></tr>`;
    let layers = {};
    windowObj.components.forEach(c => { if(!layers[c.layer]) layers[c.layer] = []; layers[c.layer].push(c); });
    Object.keys(layers).forEach(layerName => {
      printBody.innerHTML += `<tr><td colspan="3" style="font-size:12px; font-weight:bold; color:#555; padding: 4px 10px; background:#f9f9f9; border-top:1px dashed #ccc;">➔ ${layerName}</td></tr>`;
      layers[layerName].forEach(c => {
        let displayPrice = c.subtotalPrice === 0 ? 'Included' : formatRupiah(c.subtotalPrice);
        printBody.innerHTML += `<tr><td style="padding-left:20px;">- ${c.itemName}</td><td>${c.qtyDesc}</td><td style="text-align:right;">${displayPrice}</td></tr>`;
      });
    });
  });

  document.getElementById('printSubtotal').innerText = formatRupiah(cartTotals.subTotal); document.getElementById('printDiscount').innerText = `- ${formatRupiah(cartTotals.discount)}`; document.getElementById('printGrandTotal').innerText = formatRupiah(cartTotals.grandTotal);
  
  const messageArea = document.getElementById('printMessageArea');
  if (docType === 'Proposal') {
    messageArea.innerHTML = `<p style="margin:0;"><b>Catatan:</b> Untuk memulai produksi, mohon pembayaran DP 50% sebesar <b>${formatRupiah(cartTotals.grandTotal / 2)}</b>.</p>`;
  } else {
    let paid = parseFloat(document.getElementById('amountPaid').value) || 0;
    messageArea.innerHTML = `<div style="display:flex; justify-content:space-between; font-size:16px;"><div><b>Telah Dibayar:</b><br>${formatRupiah(paid)}</div><div style="text-align:right;"><b>SISA TAGIHAN:</b><br><span style="font-size:22px;">${formatRupiah(cartTotals.grandTotal - paid)}</span></div></div>`;
  }
  window.print();
}
