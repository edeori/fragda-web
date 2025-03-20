const nodemailer = require("nodemailer");

exports.handler = async function (event) {
  try {
    const order = JSON.parse(event.body);

    let transporter = nodemailer.createTransport({
      service: "gmail", // Change if using a different SMTP provider
      auth: {
        user: process.env.EMAIL_USER, // Fetch from Netlify environment variables
        pass: process.env.EMAIL_PASS,
      },
    });

    console.log("Incoming order:", order);

    // Email to the customer
    let customerMailOptions = {
      from: process.env.EMAIL_USER,
      to: order.customerEmail, // Customer's email
      subject: "Your Order Confirmation",
      text: `
Thank you for your order, ${order.customerName}!

Here are your order details:

Order Details:
${order.items.map((i) => `- ${i.title} - ${i.price} ${i.currency}`).join("\n")}

Total: ${order.total} EUR

Your order will be shipped to:
${order.shippingAddress}
            `,
    };

    // Email to the shop owner (you)
    let ownerMailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER, // Owner's email
      subject: "New Order Received",
      text: `
New Order Received!

Customer Name: ${order.customerName}
Customer Email: ${order.customerEmail}
Shipping Address: ${order.shippingAddress}

Order Details:
${order.items.map((i) => `- ${i.title} - ${i.price} ${i.currency}`).join("\n")}

Total: ${order.total} EUR
            `,
    };

    // Send both emails in parallel
    await Promise.all([
      transporter.sendMail(customerMailOptions),
      transporter.sendMail(ownerMailOptions),
    ]);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Emails Sent" }),
    };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
