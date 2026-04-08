import {
  renderEmailLayout,
  renderOrderMeta,
  renderTimeline,
} from "./emailLayout.js";

const orderStatusUpdateEmail = ({
  customerName,
  order,
  orderUrl,
  trackingUrl,
  statusEvent,
}) => {
  const bodyHtml = `
    <div style="margin-bottom:14px;">
      ${renderOrderMeta(order)}
    </div>
    <div style="margin:0 0 12px;font-size:11px;letter-spacing:.12em;color:#8b6f82;font-weight:700;">STATUS TIMELINE</div>
    ${renderTimeline([statusEvent, ...(order.statusHistory || [])].filter(Boolean).slice(0, 5))}
  `;

  return renderEmailLayout({
    preheader: `${order.orderNumber} status updated`,
    heading: `Order status updated`,
    greeting: `Hi ${customerName},`,
    intro: statusEvent?.description || "There is a new update on your order.",
    bodyHtml,
    ctaLabel: "TRACK ORDER",
    ctaUrl: trackingUrl || orderUrl,
    secondaryCtaLabel: "VIEW ORDER",
    secondaryCtaUrl: orderUrl,
  });
};

export default orderStatusUpdateEmail;
