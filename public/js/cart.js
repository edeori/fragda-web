document.addEventListener("DOMContentLoaded", initCartUI);

function initCartUI() {
  setupCartEvents();
  loadCartSidebar();
  updateCartCount();
}

// ===============================
// 🛒 CART FUNCTIONALITY
// ===============================

function setupCartEvents() {
  const cartToggle = document.getElementById("cart-toggle");
  const cartSidebar = document.getElementById("cart-sidebar");
  const checkoutBtn = document.getElementById("checkout-btn");
  // const emailInput = document.querySelector(".customer-email");

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

  // if (checkoutBtn && emailInput) {
  if (checkoutBtn) {
    // emailInput.addEventListener("input", validateEmail);
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

  const currency = cart.length > 0 ? cart[0].currency : "";

  document.getElementById(
    "cart-total"
  ).textContent = `Total: ${calculateTotal()} ${currency}`;

  enableCheckoutButton();
}

async function renderCartItem(item, index) {
  const template = await fetchCartItemTemplate();
  const sizeLabel = item.size ? `Size: ${item.size}` : "";

  let html = template
    .replace(/{{image}}/g, item.image)
    .replace(/{{title}}/g, item.title)
    .replace(/{{size}}/g, sizeLabel)
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
  const productCard = button.closest(".product-card");

  const title = button.getAttribute("data-title");
  const price = button.getAttribute("data-price");
  const currency = button.getAttribute("data-currency");
  const image = productCard.querySelector(".product-image").src;

  const sizeSelect = productCard.querySelector(".product-size");
  const size = sizeSelect ? sizeSelect.value : null;

  let cartItem = { title, price, currency, image };

  if (size) {
    cartItem.size = size;
  }

  let cart = getCart();
  cart.push(cartItem);
  saveCart(cart);

  console.log("cart animation");
  const cartToggle = document.getElementById("cart-toggle");
  cartToggle.classList.add("cart-flash");
  setTimeout(() => cartToggle.classList.remove("cart-flash"), 500);

  updateCartCount();
  loadCartSidebar();
  openCart();
}

function removeFromCart(event) {
  event.stopPropagation();

  const index = parseInt(event.currentTarget.getAttribute("data-index"), 10);
  let cart = getCart();
  cart.splice(index, 1);
  saveCart(cart);

  updateCartCount();
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
  if (window.innerWidth > 768) {
    document.getElementById("cart-sidebar").classList.add("cart-visible");
  }
}

function calculateTotal() {
  return getCart()
    .reduce((sum, item) => sum + parseFloat(item.price), 0)
    .toFixed(2);
}

// ===============================
// 💳 CHECKOUT
// ===============================

// function validateEmail() {
//   const emailInput = document.querySelector(".customer-email");
//   const checkoutBtn = document.getElementById("checkout-btn");
//   const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput.value);

//   checkoutBtn.disabled = !isValid;
//   checkoutBtn.classList.toggle("enabled", isValid);
// }

function enableCheckoutButton() {
  const checkoutBtn = document.getElementById("checkout-btn");
  const cart = getCart();

  const isEnabled = cart.length > 0;

  if (checkoutBtn) {
    checkoutBtn.disabled = !isEnabled;
    checkoutBtn.classList.toggle("enabled", isEnabled);
  }
}

function processCheckout() {
  const cart = getCart();
  // const customerEmail = document.querySelector(".customer-email").value.trim();

  if (cart.length === 0) {
    alert("A kosár üres!");
    return;
  }

  // if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
  //   alert("Adj meg egy érvényes email címet.");
  //   return;
  // }

  const totalAmount = calculateTotal();

  localStorage.setItem(
    "pendingOrder",
    JSON.stringify({
      cart,
      // customerEmail,
      totalAmount,
    })
  );

  // Átirányítás új oldalra
  window.location.href = "/checkout.html";
}

function updateCartCount() {
  const count = getCart().length;
  const badge = document.getElementById("cart-count");

  if (badge) {
    badge.textContent = count;
    badge.style.display = count > 0 ? "inline-block" : "none";
  }
}
