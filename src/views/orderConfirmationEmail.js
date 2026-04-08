import { formatCurrency } from "../utils/formatters.js";

const orderConfirmationEmail = ({ fullName, orderNumber, total, currency, estimatedDeliveryDate }) => {
  return `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#2b2b2b;max-width:640px;margin:0 auto;padding:24px;">
      <h2 style="margin-bottom:8px;color:#6b2b5d;">Order Confirmed</h2>
      <p>Hi ${fullName}, your order <strong>${orderNumber}</strong> has been confirmed.</p>
      <p>Total: <strong>${formatCurrency(total, currency)}</strong></p>
      <p>Estimated delivery: <strong>${new Date(estimatedDeliveryDate).toDateString()}</strong></p>
      <p>Thank you for shopping with Sharbelle Beauty.</p>
    </div>
  `;
};

export default orderConfirmationEmail;
