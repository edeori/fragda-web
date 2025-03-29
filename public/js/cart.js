document.addEventListener("DOMContentLoaded", function () {
  setupCartEvents();
  loadCartSidebar();
});

// ===============================
// 🛒 CART FUNCTIONALITY
// ===============================

function setupCartEvents() {
  const cartToggle = document.getElementById("cart-toggle");
  const cartSidebar = document.getElementById("cart-sidebar");
  const checkoutBtn = document.getElementById("checkout-btn");
  const emailInput = document.querySelector(".customer-email");

  if (cartToggle && cartSidebar) {
    cartToggle.addEventListener("click", function (event) {
      event.stopPropagation();
      cartSidebar.classList.toggle("cart-visible");
    });
  }

  // Close cart when clicking outside
//   document.addEventListener("click", function (event) {
//     if (!cartSidebar.contains(event.target) && event.target !== cartToggle) {
//       cartSidebar.classList.remove("cart-visible");
//     }
//   });

  if (checkoutBtn && emailInput) {
    emailInput.addEventListener("input", validateEmail);
    checkoutBtn.addEventListener("click", processCheckout);
  }

  document.querySelectorAll(".add-to-cart").forEach((button) => {
    button.addEventListener("click", addToCart);
  });
}

// ===============================
// 🛍 CART MANAGEMENT
// ===============================

async function loadCartSidebar() {
  const cart = getCart();
  const cartList = document.getElementById("cart-items");
  cartList.innerHTML = "";

  for (let i = 0; i < cart.length; i++) {
    const itemEl = await renderCartItem(cart[i], i);
    cartList.appendChild(itemEl);
  }

  document.getElementById(
    "cart-total"
  ).textContent = `Total: ${calculateTotal()} EUR`;
}

async function renderCartItem(item, index) {
  const template = await fetchCartItemTemplate();
  let html = template
    .replace(/{{image}}/g, item.image)
    .replace(/{{title}}/g, item.title)
    .replace(/{{price}}/g, item.price)
    .replace(/{{currency}}/g, item.currency)
    .replace(/{{index}}/g, index);

  const temp = document.createElement("div");
  temp.innerHTML = html.trim();
  const el = temp.firstElementChild;

  el.querySelector(".cart-delete").addEventListener("click", removeFromCart);
  return el;
}

async function fetchCartItemTemplate() {
  const response = await fetch("/cart-item.html");
  return await response.text();
}

function addToCart(event) {
  const button = event.target;
  const title = button.getAttribute("data-title");
  const price = button.getAttribute("data-price");
  const currency = button.getAttribute("data-currency");
  const image = button
    .closest(".product-card")
    .querySelector(".product-image").src;

  let cart = getCart();
  cart.push({ title, price, currency, image });
  saveCart(cart);

  loadCartSidebar();
  openCart();
}

function removeFromCart(event) {
  event.stopPropagation();

  const index = parseInt(event.currentTarget.getAttribute("data-index"), 10);
  let cart = getCart();
  cart.splice(index, 1);
  saveCart(cart);

  loadCartSidebar();
}

// Attach event listeners dynamically after cart is loaded
function attachRemoveListeners() {
  document.querySelectorAll(".cart-delete").forEach((button) => {
    button.addEventListener("click", removeFromCart);
  });
}

// ===============================
// 🔄 CART UTILITIES
// ===============================

function getCart() {
  return JSON.parse(localStorage.getItem("cart")) || [];
}

function saveCart(cart) {
  localStorage.setItem("cart", JSON.stringify(cart));
}

function openCart() {
  document.getElementById("cart-sidebar").classList.add("cart-visible");
}

function calculateTotal() {
  return getCart()
    .reduce((sum, item) => sum + parseFloat(item.price), 0)
    .toFixed(2);
}

// ===============================
// 💳 CHECKOUT
// ===============================

function validateEmail() {
  const emailInput = document.querySelector(".customer-email");
  const checkoutBtn = document.getElementById("checkout-btn");
  const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput.value);

  checkoutBtn.disabled = !isValid;
  checkoutBtn.classList.toggle("enabled", isValid);
}

function processCheckout() {
  let cart = getCart();
  if (cart.length === 0) {
    alert("Your cart is empty!");
    return;
  }

  let customerEmail = document.querySelector(".customer-email").value.trim();
  if (!customerEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
    alert("Please enter a valid email address.");
    return;
  }

  let totalAmount = calculateTotal();

  localStorage.setItem(
    "pendingOrder",
    JSON.stringify({ cart, totalAmount, customerEmail })
  );

  alert(
    `Simulating successful payment. Sending order email to ${customerEmail}...`
  );
  sendOrderEmail();
}

// ===============================
// 📧 EMAIL SENDING
// ===============================

function sendOrderEmail() {
  let pendingOrder = JSON.parse(localStorage.getItem("pendingOrder"));
  if (!pendingOrder) return;

  fetch("/.netlify/functions/send-order-email", {
    method: "POST",
    body: JSON.stringify(pendingOrder),
    headers: { "Content-Type": "application/json" },
  })
    .then(() => {
      alert("Order confirmation email sent!");
      localStorage.removeItem("pendingOrder");
    })
    .catch(() => {
      alert("Error sending order email. Please contact support.");
    });
}

if (window.location.pathname.includes("checkout-success")) {
  sendOrderEmail();
}
