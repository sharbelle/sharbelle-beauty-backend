const orderShippedEmail = ({ fullName, orderNumber, trackingCode, estimatedDeliveryDate }) => {
  return `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#2b2b2b;max-width:640px;margin:0 auto;padding:24px;">
      <h2 style="margin-bottom:8px;color:#6b2b5d;">Your Order Has Shipped</h2>
      <p>Hi ${fullName}, great news. Order <strong>${orderNumber}</strong> is on the way.</p>
      <p>Tracking code: <strong>${trackingCode}</strong></p>
      <p>Estimated delivery: <strong>${new Date(estimatedDeliveryDate).toDateString()}</strong></p>
      <p>You can track delivery progress anytime in your account.</p>
    </div>
  `;
};

export default orderShippedEmail;
