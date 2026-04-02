const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_PORT === '465', // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  const message = {
    from: `${process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`,
    to: options.email,
    subject: options.subject,
    text: options.message,
    html: options.html,
  };

  const info = await transporter.sendMail(message);

  console.log('Message sent: %s', info.messageId);
};

const sendOrderConfirmation = async (order, user) => {
  const itemsHtml = order.orderItems
    .map(
      (item) => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.name}</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.qty}</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.price.toFixed(2)} AED</td>
    </tr>
  `
    )
    .join('');

  const html = `
    <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e1e1e1; padding: 20px;">
      <h2 style="color: #d4a373; text-align: center;">Order Confirmation - Saria Beauty</h2>
      <p>Hello ${user.name},</p>
      <p>Thank you for your order! We have received your payment and are processing your order.</p>
      <h3 style="border-bottom: 2px solid #d4a373; padding-bottom: 5px;">Order Summary</h3>
      <p><strong>Order ID:</strong> ${order._id}</p>
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="background-color: #f9f9f9;">
            <th style="text-align: left; padding: 10px;">Item</th>
            <th style="text-align: left; padding: 10px;">Qty</th>
            <th style="text-align: left; padding: 10px;">Price</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>
      <div style="margin-top: 20px; text-align: right;">
        <p><strong>Items Total:</strong> ${order.itemsPrice.toFixed(2)} AED</p>
        <p><strong>Shipping:</strong> ${order.shippingPrice.toFixed(2)} AED</p>
        <p><strong>Tax:</strong> ${order.taxPrice.toFixed(2)} AED</p>
        <p style="font-size: 18px; color: #d4a373;"><strong>Grand Total:</strong> ${order.totalPrice.toFixed(2)} AED</p>
      </div>
      <h3 style="border-bottom: 2px solid #d4a373; padding-bottom: 5px;">Shipping Address</h3>
      <p>${order.shippingAddress.address}<br>
      ${order.shippingAddress.city}, ${order.shippingAddress.postalCode}<br>
      ${order.shippingAddress.country}</p>
      <p style="text-align: center; margin-top: 30px; font-size: 12px; color: #999;">
        &copy; ${new Date().getFullYear()} Saria Beauty. All rights reserved.
      </p>
    </div>
  `;

  await sendEmail({
    email: user.email,
    subject: `Saria Beauty - Order Confirmation #${order._id}`,
    html,
  });
};

const sendAdminNewOrderAlert = async (order) => {
  const html = `
    <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e1e1e1; padding: 20px;">
      <h2 style="color: #d4a373;">New Order Received!</h2>
      <p>A new order has been placed on Saria Beauty.</p>
      <p><strong>Order ID:</strong> ${order._id}</p>
      <p><strong>Total Amount:</strong> ${order.totalPrice.toFixed(2)} AED</p>
      <p><strong>Payment Method:</strong> ${order.paymentMethod}</p>
      <p><a href="${process.env.ADMIN_SITE_URL}/admin/orders/${order._id}" style="background-color: #d4a373; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Order in Admin Panel</a></p>
    </div>
  `;

  await sendEmail({
    email: process.env.ADMIN_EMAIL,
    subject: `NEW ORDER ALERT - #${order._id}`,
    html,
  });
};

module.exports = { sendEmail, sendOrderConfirmation, sendAdminNewOrderAlert };
