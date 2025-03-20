let cart = [];

document.querySelectorAll(".add-to-cart").forEach(button => {
    button.addEventListener("click", function () {
        const title = this.dataset.title;
        const price = this.dataset.price;
        const currency = this.dataset.currency;

        cart.push({ title, price, currency });
        updateCart();
    });
});

function updateCart() {
    let cartList = document.getElementById("cart-items");
    cartList.innerHTML = "";
    cart.forEach((item, index) => {
        let li = document.createElement("li");
        li.innerHTML = `${item.title} - ${item.price} ${item.currency} 
                        <button onclick="removeFromCart(${index})">❌</button>`;
        cartList.appendChild(li);
    });
}

function removeFromCart(index) {
    cart.splice(index, 1);
    updateCart();
}

// Checkout with PayPal
document.getElementById("checkout-btn").addEventListener("click", async function () {
    let totalAmount = cart.reduce((sum, item) => sum + parseFloat(item.price), 0);

    let orderData = {
        items: cart,
        total: totalAmount,
        email: "contact@fragda.hu"
    };

    await fetch("/send-order-email", {
        method: "POST",
        body: JSON.stringify(orderData),
        headers: { "Content-Type": "application/json" }
    });

    let paypalEmail = document.querySelector("meta[name='paypal-email']").getAttribute("content");
    let paypalUrl = `https://www.paypal.com/cgi-bin/webscr?cmd=_xclick&business=${paypalEmail}&amount=${totalAmount}&currency_code=EUR&item_name=Fragda Shop Order`;
    window.location.href = paypalUrl;
});
