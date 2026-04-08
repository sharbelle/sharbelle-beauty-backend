import { formatCurrency, toOrderStatusLabel, toPaymentStatusLabel } from "../utils/formatters.js";

export const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export const formatDate = (value) => {
  if (!value) {
    return "N/A";
  }

  return new Date(value).toLocaleDateString("en-NG", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

export const formatDateTime = (value) => {
  if (!value) {
    return "N/A";
  }

  return new Date(value).toLocaleString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const renderAddressLine = (value) => (value ? `<div>${escapeHtml(value)}</div>` : "");

export const renderAddressCard = (title, address) => {
  if (!address) {
    return "";
  }

  return `
    <td style="vertical-align:top;padding:0 8px 8px 0;width:50%;">
      <div style="border:1px solid #efe6ec;background:#ffffff;border-radius:10px;padding:14px;">
        <div style="font-size:11px;letter-spacing:.12em;color:#8b6f82;margin-bottom:8px;font-weight:700;">${escapeHtml(title).toUpperCase()}</div>
        ${renderAddressLine(address.recipientName)}
        ${renderAddressLine(address.line1)}
        ${renderAddressLine(address.line2)}
        ${renderAddressLine([address.city, address.state].filter(Boolean).join(", "))}
        ${renderAddressLine(address.postalCode)}
        ${renderAddressLine(address.country)}
        ${renderAddressLine(address.phone)}
      </div>
    </td>
  `;
};

export const renderOrderItemsTable = (items = [], currency = "NGN") => {
  if (!Array.isArray(items) || items.length === 0) {
    return "";
  }

  const rows = items
    .map(
      (item) => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #f0e7ee;">
          <div style="font-weight:600;color:#2a1d28;">${escapeHtml(item.productName)}</div>
          <div style="font-size:12px;color:#8b6f82;">Qty ${item.quantity}</div>
        </td>
        <td style="padding:10px 0;border-bottom:1px solid #f0e7ee;text-align:right;font-weight:600;color:#2a1d28;">
          ${escapeHtml(formatCurrency(item.total, currency))}
        </td>
      </tr>`,
    )
    .join("");

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
      ${rows}
    </table>
  `;
};

export const renderOrderTotals = (order) => {
  const lines = [
    ["Subtotal", formatCurrency(order.subtotal, order.currency)],
    ["Shipping", formatCurrency(order.shippingFee, order.currency)],
    ["Discount", `- ${formatCurrency(order.discount, order.currency)}`],
    ["Total", formatCurrency(order.total, order.currency)],
  ];

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-top:8px;">
      ${lines
        .map(
          ([label, value], index) => `
          <tr>
            <td style="padding:6px 0;color:#5a4353;font-size:${index === lines.length - 1 ? "14px" : "13px"};font-weight:${index === lines.length - 1 ? "700" : "500"};">
              ${escapeHtml(label)}
            </td>
            <td style="padding:6px 0;text-align:right;color:#2a1d28;font-size:${index === lines.length - 1 ? "14px" : "13px"};font-weight:${index === lines.length - 1 ? "700" : "600"};">
              ${escapeHtml(value)}
            </td>
          </tr>
        `,
        )
        .join("")}
    </table>
  `;
};

export const renderOrderMeta = (order, extras = []) => {
  const entries = [
    ["Order number", order.orderNumber],
    ["Order status", toOrderStatusLabel(order.orderStatus)],
    ["Payment status", toPaymentStatusLabel(order.paymentStatus)],
    ["Tracking code", order.trackingCode || "N/A"],
    ["Order date", formatDateTime(order.createdAt)],
    ["Estimated delivery", formatDate(order.estimatedDeliveryDate)],
    ...extras,
  ];

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:#fff;border:1px solid #efe6ec;border-radius:10px;">
      ${entries
        .map(
          ([label, value]) => `
          <tr>
            <td style="padding:10px 14px;color:#8b6f82;font-size:12px;border-bottom:1px solid #f4edf2;">${escapeHtml(label)}</td>
            <td style="padding:10px 14px;color:#2a1d28;font-size:13px;font-weight:600;text-align:right;border-bottom:1px solid #f4edf2;">${escapeHtml(value || "N/A")}</td>
          </tr>`,
        )
        .join("")}
    </table>
  `;
};

export const renderTimeline = (events = []) => {
  if (!Array.isArray(events) || events.length === 0) {
    return "";
  }

  const sorted = events
    .slice()
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return `
    <div style="border:1px solid #efe6ec;border-radius:10px;padding:14px;background:#fff;">
      ${sorted
        .map(
          (event) => `
          <div style="padding:10px 0;border-bottom:1px solid #f4edf2;">
            <div style="font-size:12px;color:#8b6f82;margin-bottom:4px;">${escapeHtml(formatDateTime(event.timestamp))}</div>
            <div style="font-size:13px;color:#2a1d28;font-weight:700;">${escapeHtml(event.label || toOrderStatusLabel(event.status))}</div>
            <div style="font-size:12px;color:#5a4353;margin-top:2px;">${escapeHtml(event.description || "")}</div>
          </div>`,
        )
        .join("")}
    </div>
  `;
};

export const renderEmailLayout = ({
  preheader,
  heading,
  greeting,
  intro,
  bodyHtml,
  ctaLabel,
  ctaUrl,
  secondaryCtaLabel,
  secondaryCtaUrl,
}) => {
  return `
    <!doctype html>
    <html>
      <body style="margin:0;background:#f7f3f6;padding:24px 12px;font-family:Arial,Helvetica,sans-serif;color:#2a1d28;">
        <div style="display:none;opacity:0;overflow:hidden;max-height:0;max-width:0;color:transparent;">
          ${escapeHtml(preheader || heading || "Sharbelle update")}
        </div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:680px;margin:0 auto;border-collapse:collapse;">
          <tr>
            <td style="background:#ffffff;border:1px solid #efe6ec;border-radius:14px;padding:24px;">
              <div style="font-size:11px;letter-spacing:.12em;color:#8b6f82;font-weight:700;">SHARBELLE BEAUTY</div>
              <h1 style="margin:10px 0 8px;font-size:26px;line-height:1.2;color:#2a1d28;">${escapeHtml(heading)}</h1>
              ${greeting ? `<p style="margin:0 0 6px;font-size:14px;color:#3f2e3b;">${escapeHtml(greeting)}</p>` : ""}
              ${intro ? `<p style="margin:0 0 18px;font-size:14px;line-height:1.55;color:#5a4353;">${escapeHtml(intro)}</p>` : ""}

              ${bodyHtml}

              ${(ctaLabel && ctaUrl) || (secondaryCtaLabel && secondaryCtaUrl)
                ? `
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:20px;border-collapse:collapse;">
                  <tr>
                    ${
                      ctaLabel && ctaUrl
                        ? `<td style="padding-right:10px;">
                            <a href="${escapeHtml(ctaUrl)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background:#4b1f42;color:#fff;text-decoration:none;padding:11px 16px;font-size:12px;letter-spacing:.08em;font-weight:700;border-radius:8px;">
                              ${escapeHtml(ctaLabel)}
                            </a>
                          </td>`
                        : ""
                    }
                    ${
                      secondaryCtaLabel && secondaryCtaUrl
                        ? `<td>
                            <a href="${escapeHtml(secondaryCtaUrl)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background:#ffffff;border:1px solid #4b1f42;color:#4b1f42;text-decoration:none;padding:10px 16px;font-size:12px;letter-spacing:.08em;font-weight:700;border-radius:8px;">
                              ${escapeHtml(secondaryCtaLabel)}
                            </a>
                          </td>`
                        : ""
                    }
                  </tr>
                </table>`
                : ""
              }

              <p style="margin:24px 0 0;font-size:12px;color:#8b6f82;line-height:1.5;">
                You received this email because you have an active order with Sharbelle Beauty.
              </p>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
};
