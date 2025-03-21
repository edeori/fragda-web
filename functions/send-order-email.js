const nodemailer = require("nodemailer");

exports.handler = async function (event) {
  try {
    console.log("📩 Function `send-order-email` triggered");

    const order = JSON.parse(event.body);

    if (!order.customerEmail) {
      throw new Error("❌ Missing `customerEmail` in request");
    }

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      throw new Error("❌ Missing SMTP credentials");
    }

    // SMTP konfiguráció
    let transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Egyedi rendelési szám generálás (ha nincs)
    const orderId = order.id || Math.floor(Math.random() * 1000000);

    // HTML verzió (jobb kinézet)
    let emailBodyHTML = `
      <h2>Thank you for your order, ${order.customerName}!</h2>
      <p>We appreciate your purchase. Your order details are as follows:</p>
      <p><strong>Order ID:</strong> ${orderId}</p>
      <ul>
        ${order.cart
          .map(
            (item) => `<li>${item.title} - ${item.price} ${item.currency}</li>`
          )
          .join("")}
      </ul>
      <p><strong>Total: ${order.totalAmount} ${order.currency}</strong></p>
      <p>We will process your order shortly.</p>
      <p>If you have any questions, feel free to reply to this email.</p>
      <br>
      <p>Best regards,</p>
      <p><strong>Fragda Shop Team</strong></p>
    `;

    // Plain text verzió (csökkenti a spam esélyét)
    let emailBodyText = `
Thank you for your order, ${order.customerName}!

We appreciate your purchase. Your order details:

Order ID: ${orderId}
${order.cart
  .map((item) => `- ${item.title}: ${item.price} ${item.currency}`)
  .join("\n")}

Total: ${order.totalAmount} ${order.currency}

We will process your order shortly.

If you have any questions, feel free to reply to this email.

Best regards,
Fragda Shop Team
    `;

    let mailOptions = {
      from: `"Fragda Shop" <${process.env.EMAIL_USER}>`,
      to: order.customerEmail,
      subject: `Your Fragda Shop Order #${orderId} Confirmation`,
      text: emailBodyText, // Spam szűrők miatt fontos
      html: emailBodyHTML,
    };

    console.log("📨 Sending email...");
    await transporter.sendMail(mailOptions);
    console.log("✅ Email Sent Successfully!");

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Email sent successfully!" }),
    };
  } catch (error) {
    console.error("❌ Error:", error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
