const orderDeliveredEmail = ({ fullName, orderNumber }) => {
  return `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#2b2b2b;max-width:640px;margin:0 auto;padding:24px;">
      <h2 style="margin-bottom:8px;color:#6b2b5d;">Order Delivered</h2>
      <p>Hi ${fullName}, your order <strong>${orderNumber}</strong> has been delivered.</p>
      <p>We hope you love your products. Thank you for choosing Sharbelle Beauty.</p>
    </div>
  `;
};

export default orderDeliveredEmail;
