// ===============================
// Shipping rates config
// ===============================

const SHIPPING_RATES = {
  pickup:  { label: "Personal Pickup",                 cost: 0    },
  post:    { label: "Postal Delivery (Magyar Posta)",  cost: 1490 },
  courier: { label: "Courier Service",                 cost: 1990 },
  other:   { label: "Parcel Locker / Foxpost / Other", cost: 1290 },
};

function getShippingCost() {
  const method = document.getElementById("shipping-method")?.value;
  return SHIPPING_RATES[method]?.cost ?? 0;
}

function getItemsTotal(cart) {
  return cart.reduce((sum, item) => sum + parseFloat(item.price), 0);
}

function getGrandTotal(cart) {
  return getItemsTotal(cart) + getShippingCost();
}

// ===============================
// Init
// ===============================

window.addEventListener("DOMContentLoaded", initCheckoutUI);

async function initCheckoutUI() {
  const shippingSelect = document.getElementById("shipping-method");
  const paymentSelect = document.getElementById("payment-method");
  const orderForm = document.getElementById("order-form");

  toggleShippingAddress();
  shippingSelect.addEventListener("change", function () {
    toggleShippingAddress();
    renderCartSummary();
  });

  populateEmailFromOrder();
  await renderCartSummary();

  if (paymentSelect) {
    paymentSelect.addEventListener("change", onPaymentMethodChange);
    onPaymentMethodChange();
  }

  if (orderForm) {
    orderForm.addEventListener("submit", handleOrderSubmit);
  }
}

// ===============================
// Payment method toggle
// ===============================

function onPaymentMethodChange() {
  const method = document.getElementById("payment-method")?.value;
  const submitBtn = document.getElementById("submit-btn");
  const paypalContainer = document.getElementById("paypal-button-container");

  if (method === "paypal") {
    submitBtn.style.display = "none";
    paypalContainer.style.display = "block";
    loadPayPalSDK();
  } else {
    submitBtn.style.display = "block";
    paypalContainer.style.display = "none";
  }
}

// ===============================
// PayPal SDK + Buttons
// ===============================

let paypalSDKLoaded = false;
let paypalButtonsRendered = false;

function loadPayPalSDK() {
  if (paypalButtonsRendered) return;

  const clientId = document.querySelector('meta[name="paypal-client-id"]')?.content;
  if (!clientId || clientId === "YOUR_PAYPAL_CLIENT_ID") {
    document.getElementById("paypal-button-container").innerHTML =
      '<p style="color:var(--gold);font-size:0.85rem;text-align:center;">PayPal Client ID nincs beállítva.</p>';
    return;
  }

  if (paypalSDKLoaded) {
    renderPayPalButtons();
    return;
  }

  const script = document.createElement("script");
  script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=HUF&intent=capture`;
  script.onload = function () {
    paypalSDKLoaded = true;
    renderPayPalButtons();
  };
  script.onerror = function () {
    document.getElementById("paypal-button-container").innerHTML =
      '<p style="color:#e55;">Hiba a PayPal betöltésekor.</p>';
  };
  document.head.appendChild(script);
}

function renderPayPalButtons() {
  if (paypalButtonsRendered) return;
  if (!window.paypal) return;

  const container = document.getElementById("paypal-button-container");
  container.innerHTML = "";

  paypal.Buttons({
    style: { layout: "vertical", color: "gold", shape: "rect", label: "pay" },

    createOrder: function (data, actions) {
      const form = document.getElementById("order-form");
      if (!form.checkValidity()) {
        form.reportValidity();
        return Promise.reject(new Error("Form validation failed"));
      }

      const cart = getCart();
      if (cart.length === 0) {
        alert("A kosár üres!");
        return Promise.reject(new Error("Empty cart"));
      }

      const itemsTotal = Math.round(getItemsTotal(cart));
      const shippingCost = getShippingCost();
      const grandTotal = itemsTotal + shippingCost;
      const currency = cart[0].currency || "HUF";

      return actions.order.create({
        purchase_units: [{
          description: "Fragda Official Merch",
          amount: {
            currency_code: currency,
            value: grandTotal.toString(),
            breakdown: {
              item_total: { currency_code: currency, value: itemsTotal.toString() },
              shipping:   { currency_code: currency, value: shippingCost.toString() },
            },
          },
          items: cart.map((item) => ({
            name: item.title + (item.size ? ` (${item.size})` : ""),
            unit_amount: { currency_code: currency, value: Math.round(parseFloat(item.price)).toString() },
            quantity: "1",
          })),
        }],
      });
    },

    onApprove: function (data, actions) {
      const loader = document.getElementById("loading-indicator");
      if (loader) loader.classList.remove("hidden");

      return actions.order.capture().then(function (details) {
        const cart = getCart();
        const formData = new FormData(document.getElementById("order-form"));
        const pendingOrder = JSON.parse(localStorage.getItem("pendingOrder")) || {};

        pendingOrder.customerName = formData.get("name");
        pendingOrder.customerEmail = formData.get("email");
        pendingOrder.phone = formData.get("phone");
        pendingOrder.shippingMethod = formData.get("shippingMethod");
        pendingOrder.paymentMethod = "PayPal";
        pendingOrder.orderNotes = formData.get("orderNotes");
        pendingOrder.currency = cart[0]?.currency || "HUF";
        pendingOrder.shippingCost = getShippingCost();
        pendingOrder.totalAmount = getGrandTotal(cart).toFixed(0);
        pendingOrder.paypalTransactionId = details.id;
        pendingOrder.paypalPayerEmail = details.payer?.email_address;

        if (["post", "courier", "other"].includes(pendingOrder.shippingMethod)) {
          pendingOrder.shippingAddress = {
            country: formData.get("country"),
            zip: formData.get("zip"),
            city: formData.get("city"),
            street: formData.get("street"),
          };
        }

        return fetch("/.netlify/functions/send-order-email", {
          method: "POST",
          body: JSON.stringify(pendingOrder),
          headers: { "Content-Type": "application/json" },
        })
          .then(() => { localStorage.removeItem("pendingOrder"); localStorage.removeItem("cart"); window.location.href = "/shop/?order=success"; })
          .catch(() => { localStorage.removeItem("pendingOrder"); localStorage.removeItem("cart"); window.location.href = "/shop/?order=success"; })
          .finally(() => { if (loader) loader.classList.add("hidden"); });
      });
    },

    onCancel: function () {},

    onError: function (err) {
      console.error("PayPal error:", err);
      alert("PayPal fizetés sikertelen. Próbáld újra, vagy válassz másik fizetési módot.");
    },
  }).render("#paypal-button-container");

  paypalButtonsRendered = true;
}

// ===============================
// Non-PayPal form submit
// ===============================

async function handleOrderSubmit(event) {
  event.preventDefault();

  const cart = getCart();
  const formData = new FormData(document.getElementById("order-form"));
  const pendingOrder = JSON.parse(localStorage.getItem("pendingOrder")) || {};

  pendingOrder.customerName = formData.get("name");
  pendingOrder.customerEmail = formData.get("email");
  pendingOrder.phone = formData.get("phone");
  pendingOrder.shippingMethod = formData.get("shippingMethod");
  pendingOrder.paymentMethod = formData.get("paymentMethod");
  pendingOrder.orderNotes = formData.get("orderNotes");
  pendingOrder.currency = cart[0]?.currency || "";
  pendingOrder.shippingCost = getShippingCost();
  pendingOrder.totalAmount = getGrandTotal(cart).toFixed(0);

  if (["post", "courier", "other"].includes(pendingOrder.shippingMethod)) {
    pendingOrder.shippingAddress = {
      country: formData.get("country"),
      zip: formData.get("zip"),
      city: formData.get("city"),
      street: formData.get("street"),
    };
  }

  const loader = document.getElementById("loading-indicator");
  if (loader) loader.classList.remove("hidden");

  fetch("/.netlify/functions/send-order-email", {
    method: "POST",
    body: JSON.stringify(pendingOrder),
    headers: { "Content-Type": "application/json" },
  })
    .then(() => { localStorage.removeItem("pendingOrder"); localStorage.removeItem("cart"); window.location.href = "/shop/?order=success"; })
    .catch(() => { alert("Hiba az email küldésekor. Vedd fel velünk a kapcsolatot."); })
    .finally(() => { if (loader) loader.classList.add("hidden"); });
}

// ===============================
// Cart rendering
// ===============================

async function renderCartSummary() {
  const cart = getCart();
  const container = document.getElementById("cart-summary");
  if (!container) return;

  const template = await fetchCartItemTemplate();
  container.innerHTML = "";

  cart.forEach((item, index) => {
    const sizeLabel = item.size ? `Size: ${item.size}` : "";
    const html = template
      .replace(/{{image}}/g, item.image)
      .replace(/{{title}}/g, item.title)
      .replace(/{{size}}/g, sizeLabel)
      .replace(/{{price}}/g, item.price)
      .replace(/{{currency}}/g, item.currency)
      .replace(/{{index}}/g, index);

    const temp = document.createElement("div");
    temp.innerHTML = html.trim();
    container.appendChild(temp.firstElementChild);
  });

  const currency = cart.length > 0 ? cart[0].currency : "";
  const itemsTotal = getItemsTotal(cart);
  const shippingCost = getShippingCost();
  const grandTotal = itemsTotal + shippingCost;

  // Subtotal
  const subtotalEl = document.createElement("div");
  subtotalEl.className = "cart-total-line";
  subtotalEl.style.cssText = "display:flex;justify-content:space-between;font-size:0.9rem;color:var(--text-muted);padding-top:1rem;border-top:1px solid var(--border);margin-top:0.5rem;";
  subtotalEl.innerHTML = `<span>Subtotal</span><span>${Math.round(itemsTotal).toLocaleString()} ${currency}</span>`;
  container.appendChild(subtotalEl);

  // Shipping
  const shippingEl = document.createElement("div");
  shippingEl.className = "cart-total-line";
  shippingEl.style.cssText = "display:flex;justify-content:space-between;font-size:0.9rem;color:var(--text-muted);margin-top:0.4rem;";
  shippingEl.innerHTML = shippingCost > 0
    ? `<span>Shipping</span><span>${shippingCost.toLocaleString()} ${currency}</span>`
    : `<span>Shipping</span><span style="color:var(--gold)">Free</span>`;
  container.appendChild(shippingEl);

  // Grand total
  const totalEl = document.createElement("div");
  totalEl.style.cssText = "display:flex;justify-content:space-between;font-size:1.05rem;font-weight:700;color:var(--gold);padding-top:0.75rem;border-top:1px solid var(--border);margin-top:0.75rem;";
  totalEl.innerHTML = `<span>Total</span><span>${Math.round(grandTotal).toLocaleString()} ${currency}</span>`;
  container.appendChild(totalEl);

  container.querySelectorAll(".cart-delete").forEach((btn) => {
    btn.addEventListener("click", removeFromCartCheckout);
  });
}

function populateEmailFromOrder() {
  const pendingOrder = JSON.parse(localStorage.getItem("pendingOrder"));
  if (!pendingOrder || !pendingOrder.customerEmail) return;
  const emailField = document.getElementById("email");
  if (emailField) emailField.value = pendingOrder.customerEmail;
}

async function fetchCartItemTemplate() {
  const response = await fetch("/checkout-item.html");
  return await response.text();
}

function getCart() {
  const pendingOrder = JSON.parse(localStorage.getItem("pendingOrder"));
  return pendingOrder?.cart || [];
}

function toggleShippingAddress() {
  const shippingSelect = document.getElementById("shipping-method");
  const addressSection = document.getElementById("shipping-address");
  const show = ["post", "courier", "other"].includes(shippingSelect?.value);
  addressSection.style.display = show ? "block" : "none";
  addressSection.querySelectorAll("input").forEach((input) => { input.required = show; });
}

function removeFromCartCheckout(event) {
  const index = parseInt(event.currentTarget.getAttribute("data-index"), 10);
  const pendingOrder = JSON.parse(localStorage.getItem("pendingOrder")) || {};
  let cart = pendingOrder.cart || [];
  cart.splice(index, 1);
  pendingOrder.cart = cart;
  localStorage.setItem("pendingOrder", JSON.stringify(pendingOrder));
  localStorage.setItem("cart", JSON.stringify(cart));
  renderCartSummary();
}
