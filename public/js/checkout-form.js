document.addEventListener("DOMContentLoaded", async function () {
  const shippingSelect = document.getElementById("shipping-method");
  const addressSection = document.getElementById("shipping-address");
  const orderForm = document.getElementById("order-form");

  toggleShippingAddress();
  shippingSelect.addEventListener("change", toggleShippingAddress);

  populateEmailFromOrder();
  await renderCartSummary();

  if (orderForm) {
    orderForm.addEventListener("submit", handleOrderSubmit);
  }
});

async function handleOrderSubmit(event) {
  event.preventDefault();

  const formData = new FormData(document.getElementById("order-form"));
  const pendingOrder = JSON.parse(localStorage.getItem("pendingOrder")) || {};

  // Form mezők hozzáadása
  pendingOrder.customerName = formData.get("name");
  pendingOrder.customerEmail = formData.get("email");
  pendingOrder.phone = formData.get("phone");
  pendingOrder.shippingMethod = formData.get("shippingMethod");
  pendingOrder.paymentMethod = formData.get("paymentMethod");
  pendingOrder.orderNotes = formData.get("orderNotes");
  pendingOrder.currency =
    (pendingOrder.cart && pendingOrder.cart[0]?.currency) || "EUR";

  if (["post", "courier", "other"].includes(pendingOrder.shippingMethod)) {
    pendingOrder.shippingAddress = {
      country: formData.get("country"),
      zip: formData.get("zip"),
      city: formData.get("city"),
      street: formData.get("street"),
    };
  }

  // Email küldés
  const loader = document.getElementById("loading-indicator");
  if (loader) loader.classList.remove("hidden");

  fetch("/.netlify/functions/send-order-email", {
    method: "POST",
    body: JSON.stringify(pendingOrder),
    headers: { "Content-Type": "application/json" },
  })
    .then(() => {
      alert("Order confirmation email sent!");
      localStorage.removeItem("pendingOrder");
      localStorage.removeItem("cart");
      window.location.href = "/shop/";
    })
    .catch(() => {
      alert("Error sending order email. Please contact support.");
    })
    .finally(() => {
      if (loader) loader.classList.add("hidden");
    });
}

async function renderCartSummary() {
  const cart = getCart();
  const container = document.getElementById("cart-summary");
  if (!container) return;

  const template = await fetchCartItemTemplate();
  const sizeLabel = item.size ? `Size: ${item.size}` : "";
  container.innerHTML = "";

  cart.forEach((item, index) => {
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
  const totalEl = document.createElement("div");
  totalEl.className = "cart-total-line";
  totalEl.textContent = `Total: €${total.toFixed(2)}`;
  container.appendChild(totalEl);
}

function populateEmailFromOrder() {
  const pendingOrder = JSON.parse(localStorage.getItem("pendingOrder"));
  if (!pendingOrder || !pendingOrder.customerEmail) return;

  const emailField = document.getElementById("email");
  if (emailField) {
    emailField.value = pendingOrder.customerEmail;
  }
}

async function fetchCartItemTemplate() {
  const response = await fetch("/cart-item.html");
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
