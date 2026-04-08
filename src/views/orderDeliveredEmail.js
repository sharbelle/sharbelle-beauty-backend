import {
  escapeHtml,
  renderEmailLayout,
  renderOrderMeta,
  renderTimeline,
} from "./emailLayout.js";

const orderDeliveredEmail = ({
  customerName,
  order,
  orderUrl,
  statusEvent,
}) => {
  const latestEvent =
    statusEvent || (order?.statusHistory || []).find((event) => event.status === "delivered");
  const bodyHtml = `
    <div style="margin-bottom:14px;">
      ${renderOrderMeta(order)}
    </div>
    ${
      latestEvent
        ? `
      <div style="border:1px solid #efe6ec;border-radius:10px;padding:14px;background:#fff;margin-bottom:14px;">
        <div style="font-size:11px;letter-spacing:.12em;color:#8b6f82;font-weight:700;margin-bottom:8px;">DELIVERY UPDATE</div>
        <div style="font-size:14px;color:#2a1d28;font-weight:700;margin-bottom:6px;">
          ${escapeHtml(latestEvent.label || "Delivered")}
        </div>
        <div style="font-size:13px;color:#5a4353;line-height:1.55;">
          ${escapeHtml(latestEvent.description || "Your order has been delivered successfully.")}
        </div>
      </div>
    `
        : ""
    }
    <div style="margin:0 0 12px;font-size:11px;letter-spacing:.12em;color:#8b6f82;font-weight:700;">RECENT TIMELINE</div>
    ${renderTimeline((order?.statusHistory || []).slice(0, 5))}
  `;

  return renderEmailLayout({
    preheader: `${order?.orderNumber || "Order"} delivered`,
    heading: "Order delivered",
    greeting: `Hi ${customerName || "there"},`,
    intro: "Your order has been delivered. We hope you love every item.",
    bodyHtml,
    ctaLabel: "VIEW ORDER",
    ctaUrl: orderUrl,
  });
};

export default orderDeliveredEmail;
