const nodemailer = require("nodemailer");

exports.handler = async function (event) {
  try {
    console.log("📩 Function `send-order-email` triggered");

    // ✅ Log incoming request body
    console.log("🔍 Incoming Request Body:", event.body);

    const order = JSON.parse(event.body);

    console.log("🛒 Order Details:", order);

    if (!order.customerEmail) {
      throw new Error("❌ Missing `customerEmail` in request");
    }

    console.log("📧 EMAIL_USER:", process.env.EMAIL_USER);
    console.log("🔐 EMAIL_PASS:", process.env.EMAIL_PASS ? "********" : "❌ MISSING");

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      throw new Error("❌ Environment variables `EMAIL_USER` or `EMAIL_PASS` are missing.");
    }

    let transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    let mailOptions = {
      from: process.env.EMAIL_USER,
      to: order.customerEmail,
      subject: "Your Order Confirmation",
      text: `Thank you for your order! Total: ${order.total} EUR.`,
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
