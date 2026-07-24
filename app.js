// PASTE YOUR SPECIFIC GOOGLE WEB APP URL HERE!
const API_URL = "https://script.google.com/macros/s/AKfycbyKUqD4vfQ1nRVLvxU_CXvKx2mtu-pWaPz43D1aYSea7QE3CwjS_BIJK2yRTWduukoM/exec"; 

let globalData = { prices: [], customers: [], orders: [], orderDetails: [], payables: [], settings: [] };
let cart = []; 
let cartModified = false;
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
  // 1. Find every single tab in the system and hide them
  const allTabs = document.querySelectorAll('.tab-content');
  allTabs.forEach(tab => {
    tab.style.display = 'none';
  });

  // 2. Show only the specific tab you clicked
  const activeTab = document.getElementById(tabId);
  if (activeTab) {
    activeTab.style.display = 'block';
  } else {
    console.error("Could not find tab with ID: " + tabId);
  }
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
  if (pin === null || pin === "") return;

  const pinSetting = globalData.settings && globalData.settings.find(s => s.Key === 'Master_PIN');
  const masterPin = pinSetting ? pinSetting.Value.toString() : "8888";
  
  if (pin === masterPin) {
    // Swap Navbar Buttons
    document.getElementById('btnAdmin').style.display = 'none';
    document.getElementById('btnLogout').style.display = 'block';
    
    // Safely add dynamic buttons, now visible by default!
    if(!document.getElementById('btnAnalysisTab')) {
      document.querySelector('.navbar').insertAdjacentHTML('beforeend', 
        `<button class="tab-link" id="btnAnalysisTab" style="display:inline-block;" onclick="switchTab('tab-analysis')">📊 Analysis</button>
         <button class="tab-link" id="btnPayablesTab" style="display:inline-block;" onclick="switchTab('tab-payables')">💸 Payables</button>
         <button class="tab-link" id="btnProductionTab" style="display:inline-block;" onclick="switchTab('tab-production')">🏭 Production</button>
         <button class="tab-link" id="btnSettingsTab" style="display:inline-block;" onclick="switchTab('tab-settings')">⚙️ Settings</button>`
      );
    } else {
      document.getElementById('btnAnalysisTab').style.display = 'inline-block';
      document.getElementById('btnPayablesTab').style.display = 'inline-block';
      document.getElementById('btnProductionTab').style.display = 'inline-block';
      document.getElementById('btnSettingsTab').style.display = 'inline-block';
    }
    
    renderAnalysis();
    renderPayables();
    renderProduction();
    
    switchTab('tab-analysis');
  } else {
    alert("Incorrect PIN.");
  }
}

// NEW FUNCTION TO LOGOUT
function logoutAdmin() {
  document.getElementById('btnAdmin').style.display = 'block';
  document.getElementById('btnLogout').style.display = 'none';
  if(document.getElementById('btnAnalysisTab')) {
    document.getElementById('btnAnalysisTab').style.display = 'none';
    document.getElementById('btnPayablesTab').style.display = 'none';
    document.getElementById('btnProductionTab').style.display = 'none';
    document.getElementById('btnSettingsTab').style.display = 'none';
  }
  switchTab('tab-pos'); 
}

// --- CUSTOMER AUTOCOMPLETE LOGIC ---
function populateCustomerDatalist() {
  const dl = document.getElementById('customerDatalist');
  if (!dl || dl.options.length > 0) return; // Prevent rebuilding every click
  
  (globalData.customers || []).forEach(c => {
    let opt = document.createElement('option');
    opt.value = c.Name;
    opt.dataset.wa = c.Phone_WA;
    opt.dataset.addr = c.Address;
    opt.dataset.tier = c.Tier;
    dl.appendChild(opt);
  });
}

function autoFillCustomer() {
  let val = document.getElementById('custName').value;
  let opts = document.getElementById('customerDatalist').options;
  for (let i = 0; i < opts.length; i++) {
    if (opts[i].value === val) {
      document.getElementById('custWA').value = opts[i].dataset.wa || "";
      document.getElementById('custAddress').value = opts[i].dataset.addr || "";
      document.getElementById('custTier').value = opts[i].dataset.tier || "Price_Reguler";
      break;
    }
  }
}

// ==========================================
// PRODUCTION TAB LOGIC
// ==========================================
function renderProduction() {
  console.log("--- Starting renderProduction ---");
  
  const tbody = document.getElementById('productionBody');
  
  // 1. Check if the HTML actually exists
  if (!tbody) {
    console.error("CRITICAL ERROR: Could not find 'productionBody' in your HTML.");
    alert("System Error: Cannot find the Production table in your index.html. Did it get accidentally deleted?");
    return;
  }

  tbody.innerHTML = "";
  
  // 2. Check if the system has loaded the payables data
  const payablesList = globalData.payables || [];
  console.log("Total Payables in database: ", payablesList.length);

  // 3. Filter out the jobs that are already marked "Done"
  const activeJobs = payablesList.filter(p => (p.Production_Status || 'Pending') !== 'Done');
  console.log("Active Production Jobs to show: ", activeJobs.length);

  // 4. Show the fallback message if empty
  if (activeJobs.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 20px; color: #7f8c8d;">
      <em>No active production jobs found. Make sure you have unpaid/active payables!</em>
    </td></tr>`;
    return;
  }
  
  // 5. Render the table
  activeJobs.forEach(p => {
    let prodStat = p.Production_Status || 'Pending';
    
    tbody.innerHTML += `
      <tr>
        <td>${p.PayableID}</td>
        <td>${new Date(p.Date).toLocaleDateString()}</td>
        <td>${p.OrderID}</td>
        <td><strong>${p.SupplierName}</strong></td>
        <td>
          <select id="prodStat_${p.PayableID}">
            <option value="Pending" ${prodStat === 'Pending' ? 'selected' : ''}>Pending (Not Told)</option>
            <option value="Told to Supplier" ${prodStat === 'Told to Supplier' ? 'selected' : ''}>Told to Supplier</option>
            <option value="Done" ${prodStat === 'Done' ? 'selected' : ''}>Done</option>
          </select>
        </td>
        <td>
          <button onclick="saveProductionStatus('${p.PayableID}')" style="background:#2980b9; color:white; padding:5px 15px; border:none; border-radius:3px; cursor:pointer;">Save</button>
        </td>
      </tr>
    `;
  });
  console.log("--- Finished renderProduction successfully ---");
}

async function saveProductionStatus(payableId) {
  const stat = document.getElementById(`prodStat_${payableId}`).value;
  const payload = {
    payableId: payableId,
    prodStatus: stat
  };
  
  await fetch(API_URL, { method: "POST", body: JSON.stringify({ action: "updateProdStatus", payload: payload }) });
  alert("Supplier Production Status Updated!");
  location.reload();
}

// ==========================================
// SETTINGS LOGIC
// ==========================================
function renderSettings() {
  const getVal = (key, def) => {
    let s = globalData.settings && globalData.settings.find(x => x.Key === key);
    return s ? s.Value : def;
  };
  
  document.getElementById('setPin').value = getVal('Master_PIN', '8888');
  document.getElementById('setPhone').value = getVal('Company_Phone', '081350001695');
  document.getElementById('setBank').value = getVal('Bank_Account', 'BCA 7880231817 a/n Celina Athalia Kosasih');
}

async function saveSettings() {
  const payload = [
    { key: 'Master_PIN', value: document.getElementById('setPin').value },
    { key: 'Company_Phone', value: document.getElementById('setPhone').value },
    { key: 'Bank_Account', value: document.getElementById('setBank').value }
  ];
  
  try {
    await fetch(API_URL, { method: "POST", body: JSON.stringify({ action: "updateSettings", payload: payload }) });
    alert("System Settings Saved Successfully!"); 
    location.reload(); // Reload to apply new settings to globalData
  } catch(e) { 
    alert("Error saving settings!"); 
  }
}

// ==========================================
// BOM ENGINE & WINDOW EDITING
// ==========================================
function addBOMToCart() {
  const room = document.getElementById('roomName').value || "Unnamed Window";
  
  // 1. REAL SIZES (Used for Displaying on Invoice)
  let rawW = parseFloat(document.getElementById('width').value) || 0;
  let rawH = parseFloat(document.getElementById('height').value) || 0;
  
  // 2. CALCULATION SIZES (Forces 1 Meter Minimum for pricing)
  let calcW = Math.max(rawW, 1.0);
  let calcH = Math.max(rawH, 1.0);

  const tier = document.getElementById('custTier').value; 
  
  let comps = [];
  let summaryDesc = [];

  let rawConfig = {
    roomName: room, width: rawW, height: rawH,
    layerKain: document.getElementById('layerKain').checked, kainFabric: document.getElementById('kainFabric').value, kainModel: document.getElementById('kainModel').value, kainFullness: document.getElementById('kainFullness').value, kainRail: document.getElementById('kainRail').value, kainFreeJahit: document.getElementById('kainFreeJahit').checked, kainFreeSmokering: document.getElementById('kainFreeSmokering').checked,
    layerVitrase: document.getElementById('layerVitrase').checked, vitraseFabric: document.getElementById('vitraseFabric').value, vitraseModel: document.getElementById('vitraseModel').value, vitraseFullness: document.getElementById('vitraseFullness').value, vitraseRail: document.getElementById('vitraseRail').value, vitraseFreeJahit: document.getElementById('vitraseFreeJahit').checked,
    layerRoller: document.getElementById('layerRoller').checked, rollerFabric: document.getElementById('rollerFabric').value,
    layerRoman: document.getElementById('layerRoman').checked, romanFabric: document.getElementById('romanFabric').value, incRomanLining: document.getElementById('incRomanLining').checked, romanLining: document.getElementById('romanLining').value, romanMech: document.getElementById('romanMech').value, romanLabor: document.getElementById('romanLabor').value, romanFreeJahit: document.getElementById('romanFreeJahit').checked,
    layerCuci: document.getElementById('layerCuci').checked, cuciService: document.getElementById('cuciService').value
  };

  // ==========================================
  // UPDATED FABRIC CALCULATION LOGIC
  // ==========================================
  function calculateFabric(w, h, fullness) {
    let curtainW = w + 0.10;
    
    let calculationH = h + 0.25; // Used for the actual math multiplier
    let checkH = h + 0.15;       // Used ONLY to check if it exceeds 2.80m
    
    // If checkH exceeds 2.80, flip vertically and stitch panels (using calculationH for the math)
    let qty = (checkH <= 2.80) ? (w * fullness) : (Math.ceil((curtainW / 1.40) * 2) / 2) * calculationH;
    return Number(qty.toFixed(1));
  }

  // --- KAIN ---
  if (rawConfig.layerKain) {
    if(!rawConfig.kainFabric) return alert("Select Kain Fabric!");
    let baseQty = calculateFabric(calcW, calcH, parseFloat(rawConfig.kainFullness));
    let fObj = globalData.prices.find(p => p.ItemCode === rawConfig.kainFabric);
    
    comps.push({ layer: `Gorden Kain (${rawConfig.kainModel})`, obj: fObj, qty: baseQty, desc: `${baseQty} m` });
    
    // UPDATED TIEBACK: Smart Pricing (Min 50k, round up nearest 10k)
    let tiebackBasePrice = fObj[tier] * 0.25;
    let finalTiebackPrice = Math.max(50000, Math.ceil(tiebackBasePrice / 10000) * 10000);

    comps.push({ 
      layer: `Gorden Kain (${rawConfig.kainModel})`, 
      obj: fObj, 
      qtySell: 0.25, 
      qtyModal: 0.20, 
      desc: `0.25 m`, 
      customName: `Tali Ikat (${fObj.ItemName})`, 
      overridePrice: finalTiebackPrice // Forces the new rule
    });
    
    comps.push({ layer: `Gorden Kain (${rawConfig.kainModel})`, obj: globalData.prices.find(p => p.ItemCode === 'S-JAHIT'), qty: baseQty, desc: `${baseQty} m`, isFree: rawConfig.kainFreeJahit });
    if(rawConfig.kainRail !== 'none') comps.push({ layer: `Gorden Kain (${rawConfig.kainModel})`, obj: globalData.prices.find(p => p.ItemCode === rawConfig.kainRail), qty: calcW + 0.10, desc: `${(calcW + 0.10).toFixed(2)} m` });
    
    if(rawConfig.kainModel.includes('Smokering')) {
      comps.push({ layer: `Gorden Kain (${rawConfig.kainModel})`, obj: globalData.prices.find(p => p.ItemCode === 'A-PLONG'), qty: Math.ceil(baseQty * 9), desc: `${Math.ceil(baseQty * 9)} pcs`, isFree: rawConfig.kainFreeSmokering });
    }
    summaryDesc.push(`Kain`);
  }

  // --- VITRASE ---
  if (rawConfig.layerVitrase) {
    if(!rawConfig.vitraseFabric) return alert("Select Vitrase Fabric!");
    let baseQty = calculateFabric(calcW, calcH, parseFloat(rawConfig.vitraseFullness));
    comps.push({ layer: `Vitrase (${rawConfig.vitraseModel})`, obj: globalData.prices.find(p => p.ItemCode === rawConfig.vitraseFabric), qty: baseQty, desc: `${baseQty} m` });
    comps.push({ layer: `Vitrase (${rawConfig.vitraseModel})`, obj: globalData.prices.find(p => p.ItemCode === 'S-JAHIT'), qty: baseQty, desc: `${baseQty} m`, isFree: rawConfig.vitraseFreeJahit });
    if(rawConfig.vitraseRail !== 'none') comps.push({ layer: `Vitrase (${rawConfig.vitraseModel})`, obj: globalData.prices.find(p => p.ItemCode === rawConfig.vitraseRail), qty: calcW + 0.10, desc: `${(calcW + 0.10).toFixed(2)} m` });
    summaryDesc.push(`Vitrase`);
  }

  // --- ROLLER BLIND ---
  if (rawConfig.layerRoller) {
    if(!rawConfig.rollerFabric) return alert("Select Roller Blind!");
    let area = calcW * calcH; 
    comps.push({ layer: 'Roller Blind', obj: globalData.prices.find(p => p.ItemCode === rawConfig.rollerFabric), qty: area, desc: `${area.toFixed(2)} m2` });
    summaryDesc.push(`Roller Blind`);
  }
  
  // --- ROMAN SHADE ---
  if (rawConfig.layerRoman) {
    if(!rawConfig.romanFabric || !rawConfig.romanMech || !rawConfig.romanLabor || (rawConfig.incRomanLining && !rawConfig.romanLining)) return alert("Complete Roman Dropdowns!");
    let rW = calcW + 0.25; let rH = calcH + 0.25;
    let fabricQty = (rH <= 2.65) ? rW : (Math.ceil((rW / 1.40) * 2) / 2) * rH;
    fabricQty = Math.round(fabricQty * 100) / 100;
    
    comps.push({ layer: 'Roman Shade', obj: globalData.prices.find(p => p.ItemCode === rawConfig.romanFabric), qty: fabricQty, desc: `${fabricQty} m` });
    if (rawConfig.incRomanLining) comps.push({ layer: 'Roman Shade', obj: globalData.prices.find(p => p.ItemCode === rawConfig.romanLining), qty: fabricQty, desc: `${fabricQty} m`, customName: `Furing / Lining` });
    comps.push({ layer: 'Roman Shade', obj: globalData.prices.find(p => p.ItemCode === rawConfig.romanMech), qty: rW, desc: `${rW.toFixed(2)} m` });
    comps.push({ layer: 'Roman Shade', obj: globalData.prices.find(p => p.ItemCode === rawConfig.romanLabor), qty: (rW * rH), desc: `${(rW * rH).toFixed(2)} m2`, isFree: rawConfig.romanFreeJahit });
    summaryDesc.push(`Roman Shade`);
  }

  // --- CUCI ---
  if (rawConfig.layerCuci) {
    let cuciCode = rawConfig.cuciService;
    let area = Number((calcW * calcH).toFixed(1));
    comps.push({ layer: 'Jasa Cuci', obj: globalData.prices.find(p => p.ItemCode === cuciCode), qty: area, desc: `${area.toFixed(1)} m2` });
    summaryDesc.push(`Cuci`);
  }

  if (comps.length === 0) return alert("Check at least one layer!");

  let windowObject = {
    roomId: editingWindowId || Date.now(), 
    roomName: room, 
    ukuran: `L:${rawW}m x T:${rawH}m [${summaryDesc.join(' + ')}]`,
    w: rawW, h: rawH, 
    components: [], rawConfig: rawConfig 
  };

  comps.forEach(comp => {
    if (!comp.obj) return; 
    
    let qModal = comp.qtyModal !== undefined ? comp.qtyModal : comp.qty;
    let qSell = comp.qtySell !== undefined ? comp.qtySell : comp.qty;
    
    let sellingPrice = comp.isFree ? 0 : comp.obj[tier];
    let subPrice = sellingPrice * qSell;
    
    // Apply the Tieback pricing override if it exists
    if (comp.overridePrice !== undefined) {
       subPrice = comp.overridePrice;
    }
    
    windowObject.components.push({
      layer: comp.layer, itemCode: comp.obj.ItemCode, itemName: comp.customName || comp.obj.ItemName,
      qtyDesc: comp.desc, 
      qtyModal: qModal,  
      qtySell: qSell,    
      baseCostTotal: (comp.obj.BaseCost_Modal * qModal), 
      subtotalPrice: subPrice,             
      supplier: comp.obj.SupplierName
    });
  });

  if (editingWindowId) {
    let idx = cart.findIndex(w => w.roomId === editingWindowId);
    if (idx > -1) cart[idx] = windowObject; 
    editingWindowId = null;
    let btn = document.getElementById('btnAddUpdateWindow');
    btn.innerText = "+ Add Window to Order"; btn.style.background = "#2980b9";
  } else {
    cart.push(windowObject); 
  }

  updateCartUI();
  
  document.querySelectorAll('input[type="checkbox"][id^="layer"]').forEach(cb => cb.checked = false);
  cartModified = true;
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
  document.getElementById('kainModel').value = cfg.kainModel || "Triple Pinch Pleat";
  document.getElementById('kainFullness').value = cfg.kainFullness || "2.0";
  document.getElementById('kainRail').value = cfg.kainRail || "A-REL";

  document.getElementById('layerVitrase').checked = cfg.layerVitrase;
  document.getElementById('vitraseFabric').value = cfg.vitraseFabric || "";
  document.getElementById('vitraseModel').value = cfg.vitraseModel || "Triple Pinch Pleat";
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
  
  document.getElementById('layerCuci').checked = cfg.layerCuci;
  document.getElementById('cuciService').value = cfg.cuciService || "S-CUCI";

  toggleLayers();

  editingWindowId = roomId;
  let btn = document.getElementById('btnAddUpdateWindow');
  btn.innerText = "💾 Update Window";
  btn.style.background = "#f39c12";

  document.getElementById('roomName').scrollIntoView({behavior: "smooth", block: "center"});
}

// ==========================================
// REFRESH OLD ORDERS WITH NEW DATABASE PRICES
// ==========================================
function refreshCartPrices() {
  cartModified = true;
  if (cart.length === 0) return alert("Cart is empty! Nothing to refresh.");
  if (!confirm("Are you sure you want to update all items in this order to the latest Master Prices?")) return;
  
  const tier = document.getElementById('custTier').value || "Price_Reguler";
  let updatedCount = 0;

  cart.forEach(w => {
    w.components.forEach(c => {
      if (c.itemCode && c.itemCode !== "LEGACY" && c.itemCode !== "") {
        let currentMaster = globalData.prices.find(p => p.ItemCode === c.itemCode);
        
        if (currentMaster) {
          let rawQty = parseFloat(c.qtySell !== undefined ? c.qtySell : c.qtyDesc) || 0;
          let modalQty = parseFloat(c.qtyModal !== undefined ? c.qtyModal : rawQty) || 0;
          
          c.baseCostTotal = currentMaster.BaseCost_Modal * modalQty;

          if (c.subtotalPrice > 0 || !c.hasOwnProperty('subtotalPrice')) {
              // Apply Tieback Rule during refresh!
              if (c.itemName && c.itemName.toLowerCase().includes('ikat')) {
                  let baseTieback = currentMaster[tier] * rawQty;
                  c.subtotalPrice = Math.max(50000, Math.ceil(baseTieback / 10000) * 10000);
              } else {
                  c.subtotalPrice = currentMaster[tier] * rawQty;
              }
          }
          updatedCount++;
        }
      }
    });
  });

  updateCartUI();
  alert(`Success! Recalculated prices for ${updatedCount} components.`);
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

function removeWindow(index) { cart.splice(index, 1); cartModified = true; updateCartUI(); }

function clearCartAndOrder() {
  document.getElementById('currentOrderId').value = "";
  document.getElementById('displayOrderId').innerText = "";
  document.getElementById('editAlert').hidden = true;
  
  // Clear Customer & Window Builder
  document.getElementById('custName').value = "";
  document.getElementById('custWA').value = "";
  document.getElementById('custAddress').value = "";
  document.getElementById('custTier').value = "Price_Reguler";
  
  document.getElementById('roomName').value = "";
  document.getElementById('width').value = "1.0";
  document.getElementById('height').value = "1.0";
  document.querySelectorAll('input[type="checkbox"][id^="layer"]').forEach(cb => cb.checked = false);
  toggleLayers();
  
  // Clear Payment
  document.getElementById('amountPaid').value = 0;
  document.getElementById('orderStatus').value = "Draft";
  document.getElementById('discountValue').value = 0;
  document.getElementById('discountType').value = "rp";
  
  // Reset Cart & Memory Snapshot
  cart = [];
  editingWindowId = null;
  window.originalLoadedCartJSON = null; // <--- NEW! Clears the snapshot
  
  let btn = document.getElementById('btnAddUpdateWindow');
  if(btn) { btn.innerText = "+ Add Window to Order"; btn.style.background = "#2980b9"; }
  
  updateCartUI();
}

async function saveOrder() {
  const custName = document.getElementById('custName').value;
  if (!custName) return alert("Please enter Customer Name!");
  if (cart.length === 0) return alert("Cart is empty!");

  document.getElementById('btnSave').innerText = "⏳ Saving...";

  // SMART AUTO-DETECT: Did the cart items actually change?
  let currentCartJSON = JSON.stringify(cart);
  let cartWasModified = true;

  // If the cart perfectly matches the snapshot, we ONLY changed payments!
  if (window.originalLoadedCartJSON && window.originalLoadedCartJSON === currentCartJSON) {
      cartWasModified = false;
  }

  let payloadData = {
    orderId: document.getElementById('currentOrderId').value,
    customerName: custName,
    customerWA: document.getElementById('custWA').value,
    customerAddress: document.getElementById('custAddress').value,
    customerTier: document.getElementById('custTier').value,
    subTotal: cartTotals.subTotal,
    discount: cartTotals.discount,
    grandTotal: cartTotals.grandTotal,
    totalModal: cartTotals.totalModal,
    amountPaid: parseFloat(document.getElementById('amountPaid').value) || 0,
    status: document.getElementById('orderStatus').value,
    notes: currentCartJSON, 
    isCartModified: cartWasModified, // <--- Sends the Auto-Detect result to backend!
    cartItems: []
  };

  cart.forEach(w => {
    w.components.forEach(c => {
      let finalPleatType = "";
      if (c.layer.includes('Kain') || c.layer.includes('Vitrase')) {
        if (c.layer.includes('(') && c.layer.includes(')')) {
          finalPleatType = c.layer.substring(c.layer.indexOf('(') + 1, c.layer.indexOf(')'));
        }
      }
      payloadData.cartItems.push({
        room: w.roomName, itemCode: c.itemCode, itemName: c.itemName, pleatType: finalPleatType,
        w: w.w, h: w.h, qtyDesc: c.qtyDesc, qtyModal: c.qtyModal, qtySell: c.qtySell,   
        baseCostTotal: c.baseCostTotal, subtotalPrice: c.subtotalPrice
      });
    });
  });

  const requestData = { action: 'saveOrder', payload: payloadData };

  try {
    let res = await fetch(API_URL, { method: "POST", body: JSON.stringify(requestData) });
    let data = await res.json();
    
    if (data.success) {
      alert("Order Saved Successfully!");
      location.reload(); 
    } else {
      let errorMsg = data.error || data.message || JSON.stringify(data);
      alert(errorMsg);
      document.getElementById('btnSave').innerText = "💾 Save / Update Order";
    }
  } catch (err) {
    alert("Failed to connect to database. " + err.message);
    document.getElementById('btnSave').innerText = "💾 Save / Update Order";
  }
}

function renderCustomerList() {
  const searchInput = document.getElementById('crmSearch');
  const listDiv = document.getElementById('crmCustomerList');
  if (!searchInput || !listDiv) return;

  const searchTerm = searchInput.value.toLowerCase().trim();
  listDiv.innerHTML = "";

  // Strict, crash-proof filtering
  let filtered = (globalData.customers || []).filter(c => {
    let name = c.Name ? c.Name.toString().toLowerCase() : "";
    let phone = c.Phone_WA ? c.Phone_WA.toString().toLowerCase() : "";
    
    // Only return exact matches to what is typed
    return name.includes(searchTerm) || phone.includes(searchTerm);
  });

  // Sort alphabetically to keep it organized
  filtered.sort((a, b) => (a.Name || "").localeCompare(b.Name || ""));

  filtered.forEach(c => {
    listDiv.innerHTML += `
      <div class="crm-list-item" onclick="viewCustomerProfile('${c.CustomerID}')">
        <strong style="color:#2c3e50; font-size:14px;">${c.Name}</strong> <br>
        <span style="font-size:12px; color:#7f8c8d;">WA: ${c.Phone_WA || '-'}</span>
      </div>`;
  });
}

// ==========================================
// CRM: VIEW CUSTOMER PROFILE & HISTORY
// ==========================================
function viewCustomerProfile(custId) {
  // 1. Find Customer
  const customer = globalData.customers.find(c => c.CustomerID === custId);
  if (!customer) return;

  // 2. Populate Profile Fields
  document.getElementById('editCustId').value = customer.CustomerID;
  document.getElementById('editCustName').value = customer.Name;
  document.getElementById('editCustWA').value = customer.Phone_WA || "";
  document.getElementById('editCustAddress').value = customer.Address || "";
  document.getElementById('editCustTier').value = customer.Tier || "Price_Reguler";

  // 3. Find and Render Order History
  const historyBody = document.getElementById('crmOrderHistory');
  historyBody.innerHTML = "";

  let custOrders = (globalData.orders || []).filter(o => o.CustomerID === custId);
  
  // Sort orders newest first
  custOrders.sort((a, b) => new Date(b.Date) - new Date(a.Date));

  custOrders.forEach(o => {
    // Count how many items were in this order
    let itemCount = (globalData.orderDetails || []).filter(d => d.OrderID === o.OrderID).length;
    
    // Status color formatting
    let statusColor = o.Status === 'Lunas' ? '#27ae60' : (o.Status === 'DP' ? '#f39c12' : '#e74c3c');

    historyBody.innerHTML += `
      <tr>
        <td><b>${o.OrderID}</b><br><span style="color:#777; font-size:10px;">${new Date(o.Date).toLocaleDateString()}</span></td>
        <td>${itemCount} Items</td>
        <td>${formatRupiah(o.GrandTotal)}</td>
        <td style="color:${statusColor}; font-weight:bold;">${o.Status}</td>
        <td>
          <button onclick="editOrderInPOS('${o.OrderID}', '${custId}')" style="background:#2980b9; color:white; padding:5px; border-radius:3px; cursor:pointer;">Edit/View</button>
        </td>
      </tr>
    `;
  });

  // 4. Show the Profile Panel
  document.getElementById('crmProfile').style.display = 'block';
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
  document.getElementById('custName').value = customer.Name; 
  document.getElementById('custWA').value = customer.Phone_WA; 
  document.getElementById('custAddress').value = customer.Address || ""; 
  document.getElementById('custTier').value = customer.Tier || "Price_Reguler";
  
  const order = globalData.orders.find(o => o.OrderID === orderId);
  document.getElementById('orderStatus').value = order.Status; 
  document.getElementById('amountPaid').value = order.AmountPaid;
  document.getElementById('discountType').value = 'rp'; 
  document.getElementById('discountValue').value = order.Discount || 0;

  cart = [];
  
 // MAGIC RESTORE: Load the exact UI memory from the new System_Memory column
  let restoredCart = null;
  let rawMemoryString = order.System_Memory || ""; 

  try {
    if (rawMemoryString) {
      restoredCart = JSON.parse(rawMemoryString);
    } else if (order.Notes && order.Notes.includes('=== SYSTEM MEMORY (DO NOT EDIT) ===')) {
      let jsonPart = order.Notes.split('=== SYSTEM MEMORY (DO NOT EDIT) ===')[1].trim();
      restoredCart = JSON.parse(jsonPart);
      rawMemoryString = jsonPart; 
    } else if (order.Notes && order.Notes.includes('roomId')) {
      restoredCart = JSON.parse(order.Notes);
      rawMemoryString = order.Notes; 
    }
  } catch(e) {
    console.log("No JSON memory found, falling back to legacy format.");
  }

  // NEW: Take a snapshot of the exact loaded cart!
  window.originalLoadedCartJSON = rawMemoryString;

  if (restoredCart) {
    cart = restoredCart;
  } else {
    // LEGACY FALLBACK: For old imported orders without memory
    const details = globalData.orderDetails.filter(d => d.OrderID === orderId);
    let roomsMap = {};
    
    details.forEach(d => {
      if (!roomsMap[d.RoomName]) {
          roomsMap[d.RoomName] = { 
              roomId: Date.now() + Math.random(), 
              roomName: d.RoomName, 
              w: d['Width(m)'], 
              h: d['Height(m)'], 
              ukuran: `L:${d['Width(m)']}m x T:${d['Height(m)']}m`,
              components: [], 
              rawConfig: {} 
          };
      }
      
      roomsMap[d.RoomName].components.push({ 
          layer: "Rincian Item", 
          itemCode: (d.ItemCode === 'LEGACY') ? '' : d.ItemCode, 
          itemName: d.ItemName, 
          // Updated to look at the new Qty_Sell column (Col I)
          qtyDesc: parseFloat(d['Qty_Sell']) || d['Qty_Sell'] || 0, 
          qtyModal: parseFloat(d['Qty_Modal']) || 0,
          qtySell: parseFloat(d['Qty_Sell']) || 0,
          baseCostTotal: parseFloat(d.BaseCostTotal) || 0, 
          subtotalPrice: parseFloat(d.SubtotalPrice) || 0 
      });
    });
    cart = Object.values(roomsMap);
  }

  document.getElementById('currentOrderId').value = orderId; 
  document.getElementById('displayOrderId').innerText = orderId; 
  document.getElementById('editAlert').hidden = false;
  
  updateCartUI(); 
  cartModified = false;
  switchTab('tab-pos');
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
  if (!tbody) return; // Fallback safeguard
  tbody.innerHTML = "";
  
  const searchEl = document.getElementById('piutangSearch');
  const sortEl = document.getElementById('piutangSort');
  const searchText = searchEl ? searchEl.value.toLowerCase() : "";
  const sortType = sortEl ? sortEl.value : "date_desc";

  // Filter: Only get unpaid orders
  let unpaidOrders = (globalData.orders || []).filter(o => o.Status !== 'Lunas' && o.AmountPaid < o.GrandTotal && o.GrandTotal > 0);
  
  // Map extra details for sorting
  unpaidOrders = unpaidOrders.map(o => {
    let cust = (globalData.customers || []).find(c => c.CustomerID === o.CustomerID);
    o.customerName = cust ? cust.Name : 'Unknown';
    o.sisaTagihan = o.GrandTotal - o.AmountPaid;
    return o;
  });

  if (searchText) {
    unpaidOrders = unpaidOrders.filter(o => o.customerName.toLowerCase().includes(searchText) || o.OrderID.toLowerCase().includes(searchText));
  }

  unpaidOrders.sort((a, b) => {
    if (sortType === 'date_desc') return new Date(b.Date) - new Date(a.Date);
    if (sortType === 'date_asc') return new Date(a.Date) - new Date(b.Date);
    if (sortType === 'sisa_desc') return b.sisaTagihan - a.sisaTagihan;
    if (sortType === 'sisa_asc') return a.sisaTagihan - b.sisaTagihan;
    return 0;
  });
  
  unpaidOrders.forEach(o => {
    tbody.innerHTML += `<tr>
      <td>${o.OrderID}</td><td>${new Date(o.Date).toLocaleDateString()}</td>
      <td>${o.customerName}</td><td>${formatRupiah(o.GrandTotal)}</td>
      <td>${formatRupiah(o.AmountPaid)}</td><td style="color:#e74c3c; font-weight:bold;">${formatRupiah(o.sisaTagihan)}</td>
      <td><button onclick="switchTab('tab-crm'); document.getElementById('crmSearch').value='${o.customerName}'; renderCustomerList();" style="background:#f39c12; padding:5px;">View in CRM</button></td>
    </tr>`;
  });
}

function renderAnalysis() {
  const tbody = document.getElementById('analysisBody');
  if(!tbody) return;
  tbody.innerHTML = "";
  
  const searchEl = document.getElementById('analysisSearch');
  const sortEl = document.getElementById('analysisSort');
  const searchText = searchEl ? searchEl.value.toLowerCase() : "";
  const sortType = sortEl ? sortEl.value : "date_desc";

  let analysisData = (globalData.orders || []).map(o => {
    let cust = (globalData.customers || []).find(c => c.CustomerID === o.CustomerID);
    o.customerName = cust ? cust.Name : 'Unknown';
    
    // Items Count (Count distinct rows in Order_Details)
    let items = (globalData.orderDetails || []).filter(d => d.OrderID === o.OrderID);
    o.itemsCount = items.length; 
    
    // Supplier Math (Check payables for this order)
    let orderPayables = (globalData.payables || []).filter(p => p.OrderID === o.OrderID);
    o.supplierCost = orderPayables.reduce((sum, p) => sum + p.AmountDue, 0);
    o.supplierPaid = orderPayables.reduce((sum, p) => sum + p.AmountPaid, 0);
    
    // Status Logic
    if (o.supplierCost === 0) o.supplierStatus = "<span style='color:#777'>No Cost</span>";
    else if (o.supplierPaid >= o.supplierCost) o.supplierStatus = "<span style='color:green; font-weight:bold;'>Paid</span>";
    else o.supplierStatus = "<span style='color:red; font-weight:bold;'>Unpaid</span>";
    
    let custStatusColor = o.Status === 'Lunas' ? 'green' : (o.Status === 'DP' ? 'orange' : 'red');
    o.custStatusFormatted = `<span style='color:${custStatusColor}; font-weight:bold;'>${o.Status}</span>`;

    return o;
  });

  if (searchText) {
    analysisData = analysisData.filter(o => o.customerName.toLowerCase().includes(searchText) || o.OrderID.toLowerCase().includes(searchText));
  }

  analysisData.sort((a, b) => {
    if (sortType === 'date_desc') return new Date(b.Date) - new Date(a.Date);
    if (sortType === 'date_asc') return new Date(a.Date) - new Date(b.Date);
    if (sortType === 'pnl_desc') return b.NetProfit - a.NetProfit;
    if (sortType === 'pnl_asc') return a.NetProfit - b.NetProfit;
    return 0;
  });
  
  analysisData.forEach(o => {
    tbody.innerHTML += `<tr>
      <td style="text-align:left;"><b>${o.OrderID}</b><br><span style="color:#777;">${new Date(o.Date).toLocaleDateString()}</span></td>
      <td style="text-align:left;">${o.customerName}</td>
      <td>${o.itemsCount} Items</td>
      <td>${formatRupiah(o.supplierCost)}</td>
      <td>${formatRupiah(o.supplierPaid)}</td>
      <td>${o.supplierStatus}</td>
      <td>${formatRupiah(o.AmountPaid)}</td>
      <td>${o.custStatusFormatted}</td>
      <td style="color:green; font-weight:bold; font-size:14px;">${formatRupiah(o.NetProfit)}</td>
    </tr>`;
  });
}

function renderPayables() { 
  const tbody = document.getElementById('payablesBody'); 
  if (!tbody) return;
  tbody.innerHTML = ""; 
  let totalHutang = 0; 
  
  // Safety fallback for the payables list
  const payablesList = globalData.payables || []; 
  
  payablesList.forEach(p => { 
    // NEW LOGIC: If the status is 'Paid' or 'Lunas', do not show it in the list!
    if (p.Status === 'Paid' || p.Status === 'Lunas') return;

    let sisaHutang = p.AmountDue - (p.AmountPaid || 0); 
    if (sisaHutang > 0) totalHutang += sisaHutang; 
    
    tbody.innerHTML += `
      <tr>
        <td>${p.PayableID}</td>
        <td>${new Date(p.Date).toLocaleDateString()}</td>
        <td>${p.SupplierName}</td>
        <td>${p.OrderID}</td>
        <td>${formatRupiah(p.AmountDue)}</td>
        <td><input type="number" id="pay_${p.PayableID}" value="${p.AmountPaid || 0}" style="width:100px;"></td>
        <td>
          <select id="stat_${p.PayableID}">
            <option value="Unpaid" ${p.Status === 'Unpaid' ? 'selected' : ''}>Unpaid</option>
            <option value="Paid" ${p.Status === 'Paid' ? 'selected' : ''}>Paid</option>
          </select>
        </td>
        <td><button onclick="savePayable('${p.PayableID}')">Update</button></td>
      </tr>
    `; 
  }); 
  
  // Update the Total Hutang summary at the bottom
  const totalHutangElement = document.getElementById('totalHutang');
  if (totalHutangElement) {
      totalHutangElement.innerText = formatRupiah(totalHutang); 
  }
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

// ==========================================
// SYNC / REFRESH DATA
// ==========================================
async function syncApp() {
  const syncBtn = document.getElementById('btnSync');
  const originalText = syncBtn.innerHTML;
  
  // Show loading state
  syncBtn.innerHTML = "⏳ Syncing...";
  syncBtn.style.opacity = "0.7";
  syncBtn.disabled = true;

  try {
    // Fetch fresh data from the backend
    const response = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({ action: "getData" })
    });
    
    const freshData = await response.json();
    globalData = freshData; // Update your local database
    
    // Re-render all active tables to show the fresh data instantly
    if (typeof renderPayables === "function") renderPayables();
    if (typeof renderProduction === "function") renderProduction();
    // Add renderHistory() here if you have a history tab!
    
    // Success feedback
    syncBtn.innerHTML = "✅ Synced!";
    setTimeout(() => {
      syncBtn.innerHTML = originalText;
      syncBtn.style.opacity = "1";
      syncBtn.disabled = false;
    }, 2000);
    
  } catch (error) {
    console.error("Sync failed:", error);
    syncBtn.innerHTML = "❌ Failed";
    alert("Check your internet connection and try again.");
    setTimeout(() => {
      syncBtn.innerHTML = originalText;
      syncBtn.style.opacity = "1";
      syncBtn.disabled = false;
    }, 2000);
  }
}

// ==========================================
// RECORD PRINT ACTIONS
// ==========================================
function recordPrint(orderId, type) {
  // type should be exactly 'quotation' or 'invoice'
  console.log(`Recording print for ${orderId} as ${type}...`);
  
  fetch(API_URL, {
    method: "POST",
    body: JSON.stringify({
      action: "logPrint",
      payload: {
        orderId: orderId,
        printType: type
      }
    })
  }).then(res => res.json())
    .then(data => {
      if(data.success) {
        console.log(`Successfully logged ${type} printed on ${data.date}`);
      }
    }).catch(err => console.error("Failed to log print status", err));
}

// ==========================================
// PRINTING ENGINE (A4 FIT & RICH DETAILS)
// ==========================================
function generateDocument(docType) {
  // 1. AMBIL PENGATURAN DARI DATABASE SPREADSHEET
  let phoneSetting = globalData.settings && globalData.settings.find(s => s.Key === 'Company_Phone');
  let companyPhone = phoneSetting ? phoneSetting.Value : '081350001695';
  document.getElementById('printCompanyPhone').innerText = companyPhone;

  let bankSetting = globalData.settings && globalData.settings.find(s => s.Key === 'Bank_Account');
  let companyBank = bankSetting ? bankSetting.Value : 'BCA 7880231817 a/n Celina Athalia Kosasih';
  let bankEl = document.getElementById('printBankAccount');
  if (bankEl) bankEl.innerText = companyBank;

  // 2. Set Header & Detail Invoice
  const isProposal = (docType === 'Proposal');
  document.getElementById('printDocType').innerText = isProposal ? "PROPOSAL PENAWARAN" : "INVOICE / TAGIHAN";
  document.getElementById('printDocStatus').innerText = isProposal ? "PENAWARAN RESMI" : "INVOICE RESMI";
  document.getElementById('printDocStatus').style.color = isProposal ? "#2980b9" : "#27ae60";

  const orderIdInput = document.getElementById('currentOrderId').value;
  document.getElementById('printOrderId').innerText = orderIdInput || ("ORD-" + new Date().getTime().toString().slice(6));
  document.getElementById('printDate').innerText = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

  // 3. Detail Pelanggan
  document.getElementById('printCustName').innerText = document.getElementById('custName').value || "Pelanggan Umum";
  document.getElementById('printCustWA').innerText = document.getElementById('custWA').value ? ("WA: " + document.getElementById('custWA').value) : "-";
  document.getElementById('printCustAddress').innerText = document.getElementById('custAddress').value || "-";

  // 4. Render Tabel Item
  const printBody = document.getElementById('printTableBody');
  printBody.innerHTML = "";

  cart.forEach(windowObj => {
    let roomSubtotal = windowObj.components.reduce((sum, c) => sum + c.subtotalPrice, 0);
    
    // Header Ruangan (colspan updated to 3 so the Total sits in column 4)
    printBody.innerHTML += `
      <tr class="print-room-row">
        <td colspan="3"><b>${windowObj.roomName}</b> <span style="font-size:9.5px; font-weight:normal; color:#555;">(${windowObj.ukuran})</span></td>
        <td style="text-align:right;"><b>${formatRupiah(roomSubtotal)}</b></td>
      </tr>`;
    
    // Kelompokkan Komponen Berdasarkan Layer
    let layers = {};
    windowObj.components.forEach(c => {
      if (!layers[c.layer]) layers[c.layer] = [];
      layers[c.layer].push(c);
    });

    Object.keys(layers).forEach(layerName => {
      // Layer Header (colspan updated to 4)
      printBody.innerHTML += `
        <tr>
          <td colspan="4" style="font-size:9.5px; font-weight:bold; color:#34495e; padding: 3px 8px; background:#f8f9fa;">➔ ${layerName}</td>
        </tr>`;
      
      layers[layerName].forEach(c => {
        let isTieback = c.itemName && c.itemName.toLowerCase().includes('ikat');
        let isSmokering = c.itemName && (c.itemName.toLowerCase().includes('smokering') || c.itemName.toLowerCase().includes('plong'));
        let isFree = (c.subtotalPrice === 0);

        // 1. Quantity Display Logic
        let displayQty = c.qtyDesc;
        if (isTieback || (isSmokering && isFree)) {
            displayQty = ""; // Hide quantity for Tiebacks and Free Smokerings
        }

        // 2. Split Price into Unit and Total Columns
        let displayUnitPrice = "-";
        let displayTotalPrice = "";

        if (isFree) {
            displayTotalPrice = '<i>Included</i>';
        } else {
            displayTotalPrice = formatRupiah(c.subtotalPrice);
            // Calculate and show unit price if it's NOT a tieback
            if (!isTieback) {
                let numericQty = c.qtySell !== undefined ? c.qtySell : parseFloat(c.qtyDesc);
                if (numericQty > 0) {
                    let unitPrice = c.subtotalPrice / numericQty;
                    displayUnitPrice = formatRupiah(unitPrice);
                }
            }
        }

        // Output exactly 4 columns
        printBody.innerHTML += `
          <tr>
            <td style="padding-left:18px; color:#444;">- ${c.itemName}</td>
            <td>${displayQty}</td>
            <td style="text-align:right; color:#777;">${displayUnitPrice}</td>
            <td style="text-align:right; font-weight:bold; color:#2c3e50;">${displayTotalPrice}</td>
          </tr>`;
      });
    });
  });

  // 5. Total & Rincian Pembayaran
  document.getElementById('printSubtotal').innerText = formatRupiah(cartTotals.subTotal);
  document.getElementById('printDiscount').innerText = `- ${formatRupiah(cartTotals.discount)}`;
  document.getElementById('printGrandTotal').innerText = formatRupiah(cartTotals.grandTotal);

  const paymentBreakdown = document.getElementById('printPaymentBreakdown');
  if (isProposal) {
    let dp50 = cartTotals.grandTotal / 2;
    paymentBreakdown.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <span><strong>Syarat Ketentuan DP (50%):</strong></span>
        <strong style="color:#27ae60; font-size:11px;">${formatRupiah(dp50)}</strong>
      </div>`;
  } else {
    let paid = parseFloat(document.getElementById('amountPaid').value) || 0;
    let sisa = cartTotals.grandTotal - paid;
    paymentBreakdown.innerHTML = `
      <div style="display:flex; justify-content:space-between; margin-bottom:2px;">
        <span>Telah Dibayar (DP/Pelunasan):</span>
        <strong>${formatRupiah(paid)}</strong>
      </div>
      <div style="display:flex; justify-content:space-between; border-top:1px solid #ddd; padding-top:2px;">
        <span style="font-weight:bold; color:${sisa > 0 ? '#e74c3c' : '#27ae60'};">Sisa Tagihan:</span>
        <strong style="font-size:11.5px; color:${sisa > 0 ? '#e74c3c' : '#27ae60'};">${formatRupiah(sisa)}</strong>
      </div>`;
  }

  // 6. Buka Dialog Print
  window.print();
}
