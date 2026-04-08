import { ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from "../config/constants.js";

export const toOrderStatusLabel = (status) => ORDER_STATUS_LABELS[status] || status;

export const toPaymentStatusLabel = (status) => PAYMENT_STATUS_LABELS[status] || status;

export const formatCurrency = (amount, currency = "NGN", locale = "en-NG") => {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
};
