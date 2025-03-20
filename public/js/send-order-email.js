const nodemailer = require("nodemailer");

exports.handler = async function (event) {
    try {
        const order = JSON.parse(event.body);
        
        let transporter = nodemailer.createTransport({
            service: "gmail",  // Or use a real SMTP service
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        let mailOptions = {
            from: process.env.EMAIL_USER,
            to: order.email,
            subject: "New Order Received",
            text: `Order Details:\n${order.items.map(i => `${i.title} - ${i.price} ${i.currency}`).join("\n")}\nTotal: ${order.total} EUR`
        };

        await transporter.sendMail(mailOptions);
        return { statusCode: 200, body: JSON.stringify({ message: "Email Sent" }) };
    } catch (error) {
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
};
