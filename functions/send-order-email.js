const nodemailer = require("nodemailer");

exports.handler = async function (event) {
  try {
    console.log("📩 Function `send-order-email` triggered");

    const order = JSON.parse(event.body);

    if (!order.customerEmail) {
      throw new Error("❌ Missing `customerEmail` in request");
    }

    console.log("📧 EMAIL_USER:", process.env.EMAIL_USER);
    console.log(
      "🔐 EMAIL_PASS:",
      process.env.EMAIL_PASS ? "********" : "❌ MISSING"
    );

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      throw new Error("❌ Missing SMTP credentials");
    }

    let transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    let emailBody = `
      <h2>Thank you for your order!</h2>
      <p>We have received your order. Below are your details:</p>
      <ul>
        ${order.cart
          .map(
            (item) => `<li>${item.title} - ${item.price} ${item.currency}</li>`
          )
          .join("")}
      </ul>
      <p><strong>Total: ${order.totalAmount} EUR</strong></p>
      <p>We will process your order shortly.</p>
    `;

    let mailOptions = {
      from: `"Fragda Shop" <${process.env.EMAIL_USER}>`,
      to: order.customerEmail,
      subject: "Your Fragda Shop Order Confirmation",
      html: emailBody,
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
