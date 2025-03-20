document.addEventListener("DOMContentLoaded", function () {
  const cartToggle = document.getElementById("cart-toggle");
  const cartSidebar = document.getElementById("cart-sidebar");

  // Toggle Cart Sidebar
  if (cartToggle && cartSidebar) {
    cartToggle.addEventListener("click", function (event) {
      event.stopPropagation();
      cartSidebar.classList.toggle("cart-visible");
    });
  }

  // Close Cart when clicking outside of it
  document.addEventListener("click", function (event) {
    if (
      !cartSidebar.contains(event.target) && // Click is not inside cart
      event.target !== cartToggle // Click is not on cart toggle button
    ) {
      cartSidebar.classList.remove("cart-visible");
    }
  });
});

document.addEventListener("DOMContentLoaded", function () {
  loadCartSidebar();

  document.querySelectorAll(".add-to-cart").forEach((button) => {
    button.addEventListener("click", function () {
      const title = this.getAttribute("data-title");
      const price = this.getAttribute("data-price");
      const currency = this.getAttribute("data-currency");
      const image =
        this.closest(".product-card").querySelector(".product-image").src;

      let cart = JSON.parse(localStorage.getItem("cart")) || [];
      cart.push({ title, price, currency, image });
      localStorage.setItem("cart", JSON.stringify(cart));

      loadCartSidebar(); // Refresh cart UI
    });
  });

  // Validate email and enable/disable checkout button
  const emailInput = document.querySelector(".customer-email");
  const checkoutBtn = document.getElementById("checkout-btn");

  if (emailInput && checkoutBtn) {
    emailInput.addEventListener("input", function () {
      const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.value); // ✅ Validate email
      checkoutBtn.disabled = !isValid;
      checkoutBtn.classList.toggle("enabled", isValid);
    });
  }

  const cartToggle = document.getElementById("cart-toggle");
  const cartClose = document.getElementById("cart-close");

  if (cartToggle) cartToggle.addEventListener("click", toggleCart);
  if (cartClose) cartClose.addEventListener("click", toggleCart);
  if (checkoutBtn) checkoutBtn.addEventListener("click", processCheckout);
});

function loadCartSidebar() {
  let cart = JSON.parse(localStorage.getItem("cart")) || [];
  let cartList = document.getElementById("cart-items");
  if (!cartList) return;
  cartList.innerHTML = "";

  cart.forEach((item, index) => {
    let li = document.createElement("li");
    li.innerHTML = `<img src="${item.image}" class="cart-item-image" alt="${item.title}">
                          <span class="cart-item-text">${item.title} - ${item.price} ${item.currency}</span>
                          <button class="cart-delete" onclick="removeFromCart(${index})">✖</button>`;
    cartList.appendChild(li);
  });
}

function removeFromCart(index, event) {
  event.stopPropagation(); // Prevents the event from triggering document click
  let cart = JSON.parse(localStorage.getItem("cart")) || [];
  cart.splice(index, 1);
  localStorage.setItem("cart", JSON.stringify(cart));
  loadCartSidebar(); // Refresh cart display
}

function toggleCart() {
  document.getElementById("cart-sidebar").classList.toggle("open");
}

function processCheckout() {
  let cart = JSON.parse(localStorage.getItem("cart")) || [];
  if (cart.length === 0) {
    alert("Your cart is empty!");
    return;
  }

  // ✅ Get email from the input field
  let customerEmail = document.querySelector(".customer-email").value.trim();
  if (!customerEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
    alert("Please enter a valid email address.");
    return;
  }

  let totalAmount = cart.reduce((sum, item) => sum + parseFloat(item.price), 0);
  let paypalEmail = document
    .querySelector("meta[name='paypal-email']")
    .getAttribute("content");

  let paypalUrl = `https://www.paypal.com/cgi-bin/webscr?cmd=_xclick&business=${paypalEmail}&amount=${totalAmount}&currency_code=EUR&item_name=Fragda Shop Order&return=${window.location.origin}/checkout-success`;

  // ✅ Store email with order details before redirecting
  localStorage.setItem(
    "pendingOrder",
    JSON.stringify({ cart, totalAmount, customerEmail })
  );

  // TEMPORARY: Instead of redirecting to PayPal, simulate successful payment
  alert(
    `Simulating successful payment. Sending order email to ${customerEmail}...`
  );
  sendOrderEmail();

  // window.location.href = paypalUrl; // Comment this out to prevent redirection
}

// Function to send the email AFTER payment success
function sendOrderEmail() {
  let pendingOrder = JSON.parse(localStorage.getItem("pendingOrder"));
  if (!pendingOrder) return;

  let orderData = {
    items: pendingOrder.cart,
    total: pendingOrder.totalAmount,
    customerEmail: pendingOrder.customerEmail,
  };

  fetch("/.netlify/functions/send-order-email", {
    method: "POST",
    body: JSON.stringify(orderData),
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

// Check for payment success and trigger email
if (window.location.pathname.includes("checkout-success")) {
  sendOrderEmail();
}
