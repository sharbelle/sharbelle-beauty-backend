export const USER_ROLES = ["user", "admin"];

export const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "processing",
  "packed",
  "shipped",
  "in_transit",
  "out_for_delivery",
  "delivered",
  "cancelled",
  "returned",
];

export const PAYMENT_STATUSES = ["unpaid", "pending", "paid", "failed", "refunded"];

export const ORDER_STATUS_LABELS = {
  pending: "Pending",
  confirmed: "Confirmed",
  processing: "Processing",
  packed: "Packed",
  shipped: "Shipped",
  in_transit: "In Transit",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
  returned: "Returned",
};

export const PAYMENT_STATUS_LABELS = {
  unpaid: "Unpaid",
  pending: "Pending",
  paid: "Paid",
  failed: "Failed",
  refunded: "Refunded",
};

export const TRACKING_PROGRESS_FLOW = [
  "pending",
  "confirmed",
  "processing",
  "packed",
  "shipped",
  "in_transit",
  "out_for_delivery",
  "delivered",
];

export const DEFAULT_SHIPPING_FEE = 1500;
export const DEFAULT_DISCOUNT = 0;
export const DEFAULT_CURRENCY = "NGN";
export const DEFAULT_PAYMENT_METHOD = "paystack";
