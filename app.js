// PASTE YOUR GOOGLE APP SCRIPT WEB APP URL HERE
const API_URL = "https://script.google.com/macros/s/AKfycbyKUqD4vfQ1nRVLvxU_CXvKx2mtu-pWaPz43D1aYSea7QE3CwjS_BIJK2yRTWduukoM/exec"; 

let masterPrices = {};
let cart = [];
let grandTotal = 0;

// Fetch Prices on Load
window.onload = async function() {
  try {
    const response = await fetch(API_URL);
    masterPrices = await response.json();
    document.getElementById('loadingStatus').innerText = "System Ready! Prices loaded.";
    document.getElementById('loadingStatus').style.color = "green";
  } catch (error) {
    document.getElementById('loadingStatus').innerText = "Error loading prices. Check connection.";
    console.error("Error fetching prices:", error);
  }
};

function formatRupiah(number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(number);
}

function addToCart() {
  const room = document.getElementById('roomName').value || "Unnamed Room";
  const model = document.getElementById('modelType').value;
  const tier = document.getElementById('customerTier').value;
  
  let w = parseFloat(document.getElementById('width').value) || 0;
  let h = parseFloat(document.getElementById('height').value) || 0;
  
  let effW = Math.max(w, 1.0);
  let effH = Math.max(h, 1.0);
  
  if (!masterPrices[model]) return alert("Prices still loading or missing!");
  let basePrice = masterPrices[model][tier];

  let subtotal = 0;
  let qtyDesc = "";

  if (model === 'roller') {
    let area = ((effW + 0.10) * effH).toFixed(1);
    subtotal = area * basePrice;
    qtyDesc = `${area} m2`;
  } else if (model === 'kain') {
    let finalW = effW + 0.10;
    let finalH = effH + 0.25;
    let jmlKain = Math.ceil(finalW / 1.4);
    let totalKain = finalH * jmlKain;
    subtotal = totalKain * basePrice;
    qtyDesc = `${totalKain.toFixed(2)} m`;
  } else {
    let area = (effW * effH).toFixed(1);
    subtotal = area * basePrice;
    qtyDesc = `${area} m2`;
  }

  cart.push({ room, model, w: effW, h: effH, qty: qtyDesc, subtotal });
  updateCartUI();
}

function updateCartUI() {
  const tbody = document.getElementById('cartBody');
  tbody.innerHTML = "";
  grandTotal = 0;

  cart.forEach((item, index) => {
    grandTotal += item.subtotal;
    tbody.innerHTML += `<tr>
      <td>${item.room}</td>
      <td>${item.model}</td>
      <td>${item.qty}</td>
      <td>${formatRupiah(item.subtotal)}</td>
    </tr>`;
  });

  document.getElementById('grandTotalDisplay').innerText = formatRupiah(grandTotal);
}

async function saveOrder() {
  if (cart.length === 0) return alert("Cart is empty!");
  
  const btn = document.getElementById('saveBtn');
  btn.innerText = "Saving...";
  btn.disabled = true;
  
  const orderData = {
    orderId: document.getElementById('currentOrderId').value,
    customerName: document.getElementById('customerName').value,
    customerTier: document.getElementById('customerTier').value,
    grandTotal: grandTotal,
    amountPaid: document.getElementById('amountPaid').value,
    status: document.getElementById('orderStatus').value,
    cartItems: cart
  };

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify(orderData)
    });
    
    const result = await response.json();
    if (result.success) {
      alert("Order saved! ID: " + result.orderId);
      document.getElementById('currentOrderId').value = result.orderId;
    } else {
      alert("Error saving: " + result.error);
    }
  } catch (error) {
    alert("Network Error while saving.");
    console.error(error);
  } finally {
    btn.innerText = "💾 Save / Update Order";
    btn.disabled = false;
  }
}
