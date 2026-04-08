import {
  escapeHtml,
  renderEmailLayout,
  renderOrderMeta,
} from "./emailLayout.js";
import { toPaymentStatusLabel } from "../utils/formatters.js";

const orderPaymentStatusEmail = ({
  customerName,
  order,
  orderUrl,
  note,
}) => {
  const bodyHtml = `
    <div style="margin-bottom:14px;">
      ${renderOrderMeta(order, [["Payment method", (order.paymentMethod || "").toUpperCase()]])}
    </div>
    <div style="border:1px solid #efe6ec;border-radius:10px;padding:14px;background:#fff;">
      <div style="font-size:11px;letter-spacing:.12em;color:#8b6f82;font-weight:700;margin-bottom:8px;">PAYMENT UPDATE</div>
      <div style="font-size:14px;color:#2a1d28;font-weight:700;margin-bottom:6px;">
        ${escapeHtml(toPaymentStatusLabel(order.paymentStatus))}
      </div>
      <div style="font-size:13px;color:#5a4353;line-height:1.55;">
        ${escapeHtml(note || "Your payment status has been updated by our team.")}
      </div>
    </div>
  `;

  return renderEmailLayout({
    preheader: `${order.orderNumber} payment update`,
    heading: "Payment status updated",
    greeting: `Hi ${customerName},`,
    intro: "There is an update regarding your order payment.",
    bodyHtml,
    ctaLabel: "VIEW ORDER",
    ctaUrl: orderUrl,
  });
};

export default orderPaymentStatusEmail;
