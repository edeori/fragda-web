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

    const orderId = order.id || Math.floor(Math.random() * 1000000);

    const shipping = order.shippingAddress || {};

    const shippingInfoHTML =
      order.shippingMethod === "post" ||
      order.shippingMethod === "courier" ||
      order.shippingMethod === "other"
        ? `
    <h3>Shipping Address</h3>
    <p>
      ${shipping.street || ""}<br>
      ${shipping.zip || ""} ${shipping.city || ""}<br>
      ${shipping.country || ""}
    </p>
    `
        : "";

    const shippingInfoText =
      order.shippingMethod === "post" ||
      order.shippingMethod === "courier" ||
      order.shippingMethod === "other"
        ? `
Shipping Address:
${shipping.street || ""}
${shipping.zip || ""} ${shipping.city || ""}
${shipping.country || ""}
    `
        : "(No shipping address required)";

    const notesSection =
      order.orderNotes && order.orderNotes.trim() !== ""
        ? `<p><strong>Message:</strong><br>${order.orderNotes.trim()}</p>`
        : "";

    const notesText =
      order.orderNotes && order.orderNotes.trim() !== ""
        ? `Message:\n${order.orderNotes.trim()}`
        : "";

    const emailBodyHTML = `
  <h2>Thank you for your order, ${order.customerName}!</h2>
  <p>Your order has been received with the following details:</p>
  <p><strong>Order ID:</strong> ${orderId}</p>

  <h3>Items:</h3>
  <table style="width:100%; border-collapse:collapse;">
    <thead>
      <tr style="background:#eee;">
        <th style="text-align:left; padding:8px;">Image</th>
        <th style="text-align:left; padding:8px;">Item</th>
        <th style="text-align:right; padding:8px;">Price</th>
      </tr>
    </thead>
    <tbody>
      ${(order.cart || [])
        .map(
          (item) => `
        <tr>
          <td style="padding:8px;"><img src="${item.image}" alt="${item.title}" width="50" style="border-radius:4px;"></td>
          <td style="padding:8px;">${item.title}</td>
          <td style="padding:8px; text-align:right;">${item.price} ${item.currency}</td>
        </tr>
      `
        )
        .join("")}
    </tbody>
  </table>

  <p style="margin-top:10px;"><strong>Total:</strong> ${order.totalAmount} ${
      order.currency
    }</p>

  <h3>Customer Info</h3>
  <p><strong>Name:</strong> ${order.customerName}<br>
     <strong>Email:</strong> ${order.customerEmail}<br>
     <strong>Phone:</strong> ${order.phone || "-"}</p>

  <p><strong>Shipping Method:</strong> ${order.shippingMethod}</p>
  ${shippingInfoHTML}

  <p><strong>Payment Method:</strong> ${order.paymentMethod}</p>
  ${notesSection}

  <p>We will process your order shortly.</p>
  <br>
  <p>Best regards,<br><strong>Fragda Shop Team</strong></p>
`;

    const emailBodyText = `
Thank you for your order, ${order.customerName}!

Your order has been received with the following details:

Order ID: ${orderId}

Items:
${(order.cart || [])
  .map((item) => `- ${item.title} (${item.price} ${item.currency})`)
  .join("\n")}

Total: ${order.totalAmount} ${order.currency}

Customer Info:
Name: ${order.customerName}
Email: ${order.customerEmail}
Phone: ${order.phone || "-"}

Shipping Method: ${order.shippingMethod}
${shippingInfoText}

Payment Method: ${order.paymentMethod}
${notesText}

We will process your order shortly.

Best regards,
Fragda Shop Team
`.trim();

    const mailOptions = {
      from: `"Fragda Shop" <${process.env.EMAIL_USER}>`,
      to: order.customerEmail,
      subject: `Your Fragda Shop Order #${orderId} Confirmation`,
      text: emailBodyText,
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
