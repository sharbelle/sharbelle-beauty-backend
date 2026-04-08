import {
  renderAddressCard,
  renderEmailLayout,
  renderOrderItemsTable,
  renderOrderMeta,
  renderOrderTotals,
  renderTimeline,
} from "./emailLayout.js";

const orderConfirmationEmail = ({
  customerName,
  order,
  orderUrl,
  paymentUrl,
}) => {
  const timelineEvents = (order?.statusHistory || []).slice(0, 3);
  const bodyHtml = `
    <div style="margin-bottom:14px;">
      ${renderOrderMeta(order)}
    </div>

    <div style="margin:0 0 12px;font-size:11px;letter-spacing:.12em;color:#8b6f82;font-weight:700;">ORDER ITEMS</div>
    ${renderOrderItemsTable(order?.items, order?.currency)}
    ${renderOrderTotals(order)}

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-top:14px;">
      <tr>
        ${renderAddressCard("Shipping Address", order?.shippingAddress)}
        ${renderAddressCard("Billing Address", order?.billingAddress)}
      </tr>
    </table>

    ${
      timelineEvents.length > 0
        ? `
      <div style="margin:16px 0 10px;font-size:11px;letter-spacing:.12em;color:#8b6f82;font-weight:700;">ORDER TIMELINE</div>
      ${renderTimeline(timelineEvents)}
    `
        : ""
    }
  `;

  return renderEmailLayout({
    preheader: `Order ${order?.orderNumber || "update"} received`,
    heading: "Order received",
    greeting: `Hi ${customerName || "there"},`,
    intro:
      "Thank you for your order. We have received it and will keep you updated as it moves through processing and delivery.",
    bodyHtml,
    ctaLabel: paymentUrl ? "COMPLETE PAYMENT" : "VIEW ORDER",
    ctaUrl: paymentUrl || orderUrl,
    secondaryCtaLabel: paymentUrl ? "VIEW ORDER" : undefined,
    secondaryCtaUrl: paymentUrl ? orderUrl : undefined,
  });
};

export default orderConfirmationEmail;
