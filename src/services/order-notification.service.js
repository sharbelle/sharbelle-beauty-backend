import env from "../config/env.js";
import { toOrderStatusLabel, toPaymentStatusLabel } from "../utils/formatters.js";
import { UserModel } from "../models/user.model.js";
import { sendEmail } from "./mail.service.js";
import orderConfirmationEmail from "../views/orderConfirmationEmail.js";
import orderDeliveredEmail from "../views/orderDeliveredEmail.js";
import orderPaymentStatusEmail from "../views/orderPaymentStatusEmail.js";
import orderShippedEmail from "../views/orderShippedEmail.js";
import orderStatusUpdateEmail from "../views/orderStatusUpdateEmail.js";
import adminNewOrderEmail from "../views/adminNewOrderEmail.js";

const toPlainOrder = (order) => {
  const plain = order?.toJSON ? order.toJSON() : order;

  return {
    ...plain,
    id: plain?.id || plain?._id?.toString?.(),
    userId: plain?.userId?.toString ? plain.userId.toString() : plain?.userId,
    items: plain?.items || [],
    statusHistory: plain?.statusHistory || [],
  };
};

const getCustomerForOrder = async (order) => {
  if (!order?.userId) {
    return null;
  }

  const userId = order.userId.toString ? order.userId.toString() : order.userId;

  const user = await UserModel.findById(userId).select("fullName email").lean();
  if (!user?.email) {
    return null;
  }

  return {
    id: user._id.toString(),
    fullName: user.fullName || "",
    email: user.email,
  };
};

const getAdminRecipients = async () => {
  const adminUsers = await UserModel.find({ role: "admin" }).select("fullName email").lean();
  const recipients = [...new Set(adminUsers.map((admin) => admin.email).filter(Boolean))];

  return {
    recipients,
    adminsByEmail: new Map(
      adminUsers.map((admin) => [admin.email.toLowerCase(), admin.fullName || "Admin"]),
    ),
  };
};

const makeCustomerOrderUrl = (order) => `${env.frontendOrigin}/account/orders/${order.id}`;
const makeCustomerTrackingUrl = (order) => `${env.frontendOrigin}/account/orders/${order.id}/track`;
const makeAdminOrdersUrl = () => `${env.frontendOrigin}/admin/orders`;

const sendStatusTemplate = async ({ order, customer, statusEvent }) => {
  const orderUrl = makeCustomerOrderUrl(order);
  const trackingUrl = makeCustomerTrackingUrl(order);
  const status = order.orderStatus;

  if (status === "delivered") {
    return sendEmail({
      to: customer.email,
      subject: `Delivered: ${order.orderNumber}`,
      html: orderDeliveredEmail({
        customerName: customer.fullName || customer.email,
        order,
        orderUrl,
        statusEvent,
      }),
    });
  }

  if (["shipped", "in_transit", "out_for_delivery"].includes(status)) {
    return sendEmail({
      to: customer.email,
      subject: `${toOrderStatusLabel(status)}: ${order.orderNumber}`,
      html: orderShippedEmail({
        customerName: customer.fullName || customer.email,
        order,
        orderUrl,
        trackingUrl,
        statusEvent,
      }),
    });
  }

  return sendEmail({
    to: customer.email,
    subject: `${toOrderStatusLabel(status)}: ${order.orderNumber}`,
    html: orderStatusUpdateEmail({
      customerName: customer.fullName || customer.email,
      order,
      orderUrl,
      trackingUrl,
      statusEvent,
    }),
  });
};

export const notifyOrderCreated = async ({ order, paymentUrl }) => {
  try {
    const normalizedOrder = toPlainOrder(order);
    const resolvedCustomer = await getCustomerForOrder(normalizedOrder);

    if (!resolvedCustomer?.email) {
      return;
    }

    const customerOrderUrl = makeCustomerOrderUrl(normalizedOrder);

    await sendEmail({
      to: resolvedCustomer.email,
      subject: `Order received: ${normalizedOrder.orderNumber}`,
      html: orderConfirmationEmail({
        customerName: resolvedCustomer.fullName || resolvedCustomer.email,
        order: normalizedOrder,
        orderUrl: customerOrderUrl,
        paymentUrl,
      }),
    });

    const { recipients, adminsByEmail } = await getAdminRecipients();
    const adminOrderUrl = makeAdminOrdersUrl();

    await Promise.all(
      recipients.map((recipient) =>
        sendEmail({
          to: recipient,
          subject: `New order alert: ${normalizedOrder.orderNumber}`,
          html: adminNewOrderEmail({
            adminName: adminsByEmail.get(recipient.toLowerCase()) || "Admin",
            order: normalizedOrder,
            customer: resolvedCustomer,
            adminOrderUrl,
          }),
        }),
      ),
    );
  } catch (error) {
    console.error("[mail] Failed order-created notification", error);
  }
};

export const notifyOrderStatusUpdatedByAdmin = async ({ order, statusEvent }) => {
  try {
    const normalizedOrder = toPlainOrder(order);
    const customer = await getCustomerForOrder(normalizedOrder);

    if (!customer?.email) {
      return;
    }

    await sendStatusTemplate({
      order: normalizedOrder,
      customer,
      statusEvent,
    });
  } catch (error) {
    console.error("[mail] Failed order-status notification", error);
  }
};

export const notifyOrderPaymentUpdatedByAdmin = async ({ order, note }) => {
  try {
    const normalizedOrder = toPlainOrder(order);
    const customer = await getCustomerForOrder(normalizedOrder);

    if (!customer?.email) {
      return;
    }

    await sendEmail({
      to: customer.email,
      subject: `${toPaymentStatusLabel(normalizedOrder.paymentStatus)} payment: ${normalizedOrder.orderNumber}`,
      html: orderPaymentStatusEmail({
        customerName: customer.fullName || customer.email,
        order: normalizedOrder,
        orderUrl: makeCustomerOrderUrl(normalizedOrder),
        note,
      }),
    });
  } catch (error) {
    console.error("[mail] Failed payment-status notification", error);
  }
};
