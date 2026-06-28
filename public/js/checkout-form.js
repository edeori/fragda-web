window.addEventListener("DOMContentLoaded", initCheckoutUI);

async function initCheckoutUI() {
  const shippingSelect = document.getElementById("shipping-method");
  const paymentSelect = document.getElementById("payment-method");
  const orderForm = document.getElementById("order-form");

  toggleShippingAddress();
  shippingSelect.addEventListener("change", toggleShippingAddress);

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
      '<p style="color:var(--gold);font-size:0.85rem;text-align:center;">PayPal Client ID nincs beállítva. Lásd a checkout.html meta tagját.</p>';
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
      '<p style="color:#e55;">Hiba a PayPal betöltésekor. Ellenőrizd az internetkapcsolatot.</p>';
  };
  document.head.appendChild(script);
}

function renderPayPalButtons() {
  if (paypalButtonsRendered) return;
  if (!window.paypal) return;

  const container = document.getElementById("paypal-button-container");
  container.innerHTML = "";

  paypal.Buttons({
    style: {
      layout: "vertical",
      color: "gold",
      shape: "rect",
      label: "pay",
    },

    createOrder: function (data, actions) {
      // Validate form fields before opening PayPal
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

      const total = Math.round(cart.reduce((sum, item) => sum + parseFloat(item.price), 0));

      return actions.order.create({
        purchase_units: [
          {
            description: "Fragda Official Merch",
            amount: {
              currency_code: "HUF",
              value: total.toString(),
              breakdown: {
                item_total: {
                  currency_code: "HUF",
                  value: total.toString(),
                },
              },
            },
            items: cart.map((item) => ({
              name: item.title + (item.size ? ` (${item.size})` : ""),
              unit_amount: {
                currency_code: "HUF",
                value: Math.round(parseFloat(item.price)).toString(),
              },
              quantity: "1",
            })),
          },
        ],
      });
    },

    onApprove: function (data, actions) {
      const loader = document.getElementById("loading-indicator");
      if (loader) loader.classList.remove("hidden");

      return actions.order.capture().then(function (details) {
        const formData = new FormData(document.getElementById("order-form"));
        const pendingOrder = JSON.parse(localStorage.getItem("pendingOrder")) || {};

        pendingOrder.customerName = formData.get("name");
        pendingOrder.customerEmail = formData.get("email");
        pendingOrder.phone = formData.get("phone");
        pendingOrder.shippingMethod = formData.get("shippingMethod");
        pendingOrder.paymentMethod = "PayPal";
        pendingOrder.orderNotes = formData.get("orderNotes");
        pendingOrder.currency = (pendingOrder.cart && pendingOrder.cart[0]?.currency) || "HUF";
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
          .then(() => {
            localStorage.removeItem("pendingOrder");
            localStorage.removeItem("cart");
            window.location.href = "/shop/?order=success";
          })
          .catch(() => {
            // Payment OK, email failed – still clear cart and redirect
            localStorage.removeItem("pendingOrder");
            localStorage.removeItem("cart");
            window.location.href = "/shop/?order=success";
          })
          .finally(() => {
            if (loader) loader.classList.add("hidden");
          });
      });
    },

    onCancel: function () {
      // User closed the PayPal popup, nothing to do
    },

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

  const formData = new FormData(document.getElementById("order-form"));
  const pendingOrder = JSON.parse(localStorage.getItem("pendingOrder")) || {};

  pendingOrder.customerName = formData.get("name");
  pendingOrder.customerEmail = formData.get("email");
  pendingOrder.phone = formData.get("phone");
  pendingOrder.shippingMethod = formData.get("shippingMethod");
  pendingOrder.paymentMethod = formData.get("paymentMethod");
  pendingOrder.orderNotes = formData.get("orderNotes");
  pendingOrder.currency = (pendingOrder.cart && pendingOrder.cart[0]?.currency) || "";

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
    .then(() => {
      localStorage.removeItem("pendingOrder");
      localStorage.removeItem("cart");
      window.location.href = "/shop/?order=success";
    })
    .catch(() => {
      alert("Hiba az email küldésekor. Vedd fel velünk a kapcsolatot.");
    })
    .finally(() => {
      if (loader) loader.classList.add("hidden");
    });
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

  const total = cart.reduce((sum, item) => sum + parseFloat(item.price), 0);
  const currency = cart.length > 0 ? cart[0].currency : "";
  const totalEl = document.createElement("div");
  totalEl.className = "cart-total-line";
  totalEl.textContent = `Total: ${total.toFixed(2)} ${currency}`;
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
  addressSection.querySelectorAll("input").forEach((input) => {
    input.required = show;
  });
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
