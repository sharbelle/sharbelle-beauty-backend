import {
  escapeHtml,
  renderEmailLayout,
  renderOrderMeta,
  renderTimeline,
} from "./emailLayout.js";
import { toOrderStatusLabel } from "../utils/formatters.js";

const getCurrentEvent = (order, statusEvent) => {
  if (statusEvent) {
    return statusEvent;
  }

  return (
    (order?.statusHistory || []).find((event) => event.status === order?.orderStatus) ||
    (order?.statusHistory || [])[0] ||
    null
  );
};

const orderShippedEmail = ({
  customerName,
  order,
  orderUrl,
  trackingUrl,
  statusEvent,
}) => {
  const currentEvent = getCurrentEvent(order, statusEvent);
  const bodyHtml = `
    <div style="margin-bottom:14px;">
      ${renderOrderMeta(order, [["Current step", toOrderStatusLabel(order?.orderStatus)]])}
    </div>
    ${
      currentEvent
        ? `
      <div style="border:1px solid #efe6ec;border-radius:10px;padding:14px;background:#fff;margin-bottom:14px;">
        <div style="font-size:11px;letter-spacing:.12em;color:#8b6f82;font-weight:700;margin-bottom:8px;">LATEST UPDATE</div>
        <div style="font-size:14px;color:#2a1d28;font-weight:700;margin-bottom:6px;">
          ${escapeHtml(currentEvent.label || toOrderStatusLabel(order?.orderStatus) || "Status updated")}
        </div>
        <div style="font-size:13px;color:#5a4353;line-height:1.55;">
          ${escapeHtml(currentEvent.description || "Your order is currently moving through our delivery network.")}
        </div>
      </div>
    `
        : ""
    }
    <div style="margin:0 0 12px;font-size:11px;letter-spacing:.12em;color:#8b6f82;font-weight:700;">STATUS TIMELINE</div>
    ${renderTimeline((order?.statusHistory || []).slice(0, 5))}
  `;

  return renderEmailLayout({
    preheader: `${order?.orderNumber || "Order"} is on the way`,
    heading: "Your order is on the way",
    greeting: `Hi ${customerName || "there"},`,
    intro:
      "Great news. Your order has shipped and is now in transit. You can track delivery progress in your account at any time.",
    bodyHtml,
    ctaLabel: "TRACK ORDER",
    ctaUrl: trackingUrl || orderUrl,
    secondaryCtaLabel: "VIEW ORDER",
    secondaryCtaUrl: orderUrl,
  });
};

export default orderShippedEmail;
