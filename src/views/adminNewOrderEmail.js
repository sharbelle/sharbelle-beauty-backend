import {
  renderAddressCard,
  renderEmailLayout,
  renderOrderItemsTable,
  renderOrderMeta,
  renderOrderTotals,
} from "./emailLayout.js";

const adminNewOrderEmail = ({
  adminName,
  order,
  customer,
  adminOrderUrl,
}) => {
  const bodyHtml = `
    <div style="margin-bottom:14px;">
      ${renderOrderMeta(order, [["Customer", customer?.fullName || customer?.email || "Unknown"], ["Customer email", customer?.email || "N/A"]])}
    </div>

    <div style="margin:0 0 12px;font-size:11px;letter-spacing:.12em;color:#8b6f82;font-weight:700;">ORDER ITEMS</div>
    ${renderOrderItemsTable(order.items, order.currency)}
    ${renderOrderTotals(order)}

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-top:14px;">
      <tr>
        ${renderAddressCard("Shipping Address", order.shippingAddress)}
        ${renderAddressCard("Billing Address", order.billingAddress)}
      </tr>
    </table>
  `;

  return renderEmailLayout({
    preheader: `New order ${order.orderNumber} needs attention`,
    heading: "New order received",
    greeting: `Hi ${adminName || "Admin"},`,
    intro:
      "A new order has been placed. Review payment and fulfillment steps to keep delivery moving.",
    bodyHtml,
    ctaLabel: "OPEN ORDER MANAGER",
    ctaUrl: adminOrderUrl,
  });
};

export default adminNewOrderEmail;
