import nodemailer from 'nodemailer';
import { env } from '../config/env';
import { logger } from '../utils/logger';

// Create reusable transporter
const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT || 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
});

/**
 * Send order confirmation email
 */
export const sendOrderConfirmationEmail = async (order: any): Promise<void> => {
  try {
    const itemsList = order.items.map((item: any) => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
          <div style="font-weight: 600; color: #111827;">${item.product_name}</div>
          <div style="color: #6b7280; font-size: 14px;">Size: ${item.size} | Color: ${item.color}</div>
          ${item.customization_details ? `<div style="color: #6b7280; font-size: 14px;">Custom design</div>` : ''}
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">$${item.total_price.toFixed(2)}</td>
      </tr>
    `).join('');

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
    <tr>
      <td align="center">
        <!-- Main Container -->
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #000000 0%, #1f2937 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">Order Confirmed!</h1>
              <p style="margin: 10px 0 0; color: #d1d5db; font-size: 16px;">Thank you for your order</p>
            </td>
          </tr>

          <!-- Order Info -->
          <tr>
            <td style="padding: 30px;">
              <p style="margin: 0 0 20px; color: #374151; font-size: 16px;">
                Hi <strong>${order.customer_name}</strong>,
              </p>
              <p style="margin: 0 0 20px; color: #374151; font-size: 16px;">
                Your order has been confirmed! We'll send you another email when your order ships.
              </p>

              <!-- Order Number -->
              <div style="background-color: #f9fafb; border: 2px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <div style="color: #6b7280; font-size: 14px; margin-bottom: 5px;">Order Number</div>
                <div style="color: #111827; font-size: 24px; font-weight: 700;">#${order.order_number}</div>
              </div>

              <!-- Order Items -->
              <h2 style="margin: 30px 0 15px; color: #111827; font-size: 20px; font-weight: 600;">Order Details</h2>
              <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
                <thead>
                  <tr style="background-color: #f9fafb;">
                    <th style="padding: 12px; text-align: left; color: #6b7280; font-size: 14px; font-weight: 600;">Item</th>
                    <th style="padding: 12px; text-align: center; color: #6b7280; font-size: 14px; font-weight: 600;">Qty</th>
                    <th style="padding: 12px; text-align: right; color: #6b7280; font-size: 14px; font-weight: 600;">Price</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsList}
                </tbody>
              </table>

              <!-- Pricing -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 20px;">
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Subtotal</td>
                  <td style="padding: 8px 0; text-align: right; color: #111827;">$${order.subtotal.toFixed(2)}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Shipping</td>
                  <td style="padding: 8px 0; text-align: right; color: #111827;">$${order.shipping.toFixed(2)}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Tax</td>
                  <td style="padding: 8px 0; text-align: right; color: #111827;">$${order.tax.toFixed(2)}</td>
                </tr>
                <tr style="border-top: 2px solid #e5e7eb;">
                  <td style="padding: 12px 0; color: #111827; font-size: 18px; font-weight: 700;">Total</td>
                  <td style="padding: 12px 0; text-align: right; color: #111827; font-size: 18px; font-weight: 700;">$${order.total.toFixed(2)}</td>
                </tr>
              </table>

              <!-- Shipping Address -->
              <h2 style="margin: 30px 0 15px; color: #111827; font-size: 20px; font-weight: 600;">Shipping Address</h2>
              <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; color: #374151; line-height: 1.6;">
                ${order.customer_name}<br>
                ${order.shipping_address.line1}<br>
                ${order.shipping_address.line2 ? `${order.shipping_address.line2}<br>` : ''}
                ${order.shipping_address.city}, ${order.shipping_address.state} ${order.shipping_address.postal_code}<br>
                ${order.shipping_address.country}
              </div>

              <!-- Track Order Button -->
              <div style="text-align: center; margin: 30px 0;">
                <a href="https://stolentee.com/orders/${order.id}" style="display: inline-block; background-color: #000000; color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
                  Track Your Order
                </a>
              </div>

              <!-- Support -->
              <p style="margin: 30px 0 0; color: #6b7280; font-size: 14px; text-align: center;">
                Need help? Reply to this email or visit <a href="https://stolentee.com" style="color: #000000;">stolentee.com</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #6b7280; font-size: 14px;">
                © ${new Date().getFullYear()} Stolen Tee. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    await transporter.sendMail({
      from: `"${env.SMTP_FROM_NAME}" <${env.SMTP_FROM_EMAIL}>`,
      to: order.customer_email,
      subject: `Order Confirmation #${order.order_number} - Stolen Tee`,
      html,
    });

    logger.info('Order confirmation email sent', { order_id: order.id, email: order.customer_email });
  } catch (error) {
    logger.error('Failed to send order confirmation email', { error, order_id: order.id });
    // Don't throw - email failure shouldn't break order flow
  }
};

/**
 * Send order status update email
 */
export const sendOrderStatusUpdateEmail = async (order: any, oldStatus: string): Promise<void> => {
  try {
    let statusTitle = '';
    let statusMessage = '';
    let statusColor = '#6b7280';

    switch (order.production_status) {
      case 'processing':
        statusTitle = 'Order Processing';
        statusMessage = 'Great news! We\'ve started working on your order.';
        statusColor = '#3b82f6';
        break;
      case 'shipped':
        statusTitle = 'Order Shipped!';
        statusMessage = 'Your order is on its way!';
        statusColor = '#10b981';
        break;
      case 'delivered':
        statusTitle = 'Order Delivered';
        statusMessage = 'Your order has been delivered! We hope you love it.';
        statusColor = '#059669';
        break;
      default:
        return; // Don't send email for other statuses
    }

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">

          <!-- Header -->
          <tr>
            <td style="background-color: ${statusColor}; padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">${statusTitle}</h1>
              <p style="margin: 10px 0 0; color: #ffffff; opacity: 0.9; font-size: 16px;">${statusMessage}</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 30px;">
              <p style="margin: 0 0 20px; color: #374151; font-size: 16px;">
                Hi <strong>${order.customer_name}</strong>,
              </p>

              <!-- Order Number -->
              <div style="background-color: #f9fafb; border: 2px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <div style="color: #6b7280; font-size: 14px; margin-bottom: 5px;">Order Number</div>
                <div style="color: #111827; font-size: 24px; font-weight: 700;">#${order.order_number}</div>
              </div>

              ${order.tracking_number ? `
              <!-- Tracking Info -->
              <div style="background-color: #ecfdf5; border: 2px solid #10b981; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <div style="color: #047857; font-size: 14px; margin-bottom: 5px; font-weight: 600;">Tracking Number</div>
                <div style="color: #065f46; font-size: 18px; font-weight: 700;">${order.tracking_number}</div>
                ${order.carrier ? `<div style="color: #047857; font-size: 14px; margin-top: 5px;">Carrier: ${order.carrier}</div>` : ''}
              </div>
              ` : ''}

              <!-- Track Button -->
              <div style="text-align: center; margin: 30px 0;">
                <a href="https://stolentee.com/orders/${order.id}" style="display: inline-block; background-color: #000000; color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
                  View Order Details
                </a>
              </div>

              <!-- Support -->
              <p style="margin: 30px 0 0; color: #6b7280; font-size: 14px; text-align: center;">
                Need help? Reply to this email or visit <a href="https://stolentee.com" style="color: #000000;">stolentee.com</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #6b7280; font-size: 14px;">
                © ${new Date().getFullYear()} Stolen Tee. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    await transporter.sendMail({
      from: `"${env.SMTP_FROM_NAME}" <${env.SMTP_FROM_EMAIL}>`,
      to: order.customer_email,
      subject: `${statusTitle} - Order #${order.order_number}`,
      html,
    });

    logger.info('Order status update email sent', {
      order_id: order.id,
      email: order.customer_email,
      old_status: oldStatus,
      new_status: order.production_status
    });
  } catch (error) {
    logger.error('Failed to send order status update email', { error, order_id: order.id });
    // Don't throw - email failure shouldn't break status update flow
  }
};
