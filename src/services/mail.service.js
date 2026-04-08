import env from "../config/env.js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
let resendClientPromise = null;

const getResendClient = async () => {
  if (!env.resendApiKey) {
    return null;
  }

  if (!resendClientPromise) {
    resendClientPromise = import("resend")
      .then((module) => {
        const ResendClass = module?.Resend;
        if (!ResendClass) {
          throw new Error("Resend export not found");
        }
        return new ResendClass(env.resendApiKey);
      })
      .catch((error) => {
        console.error("[mail] Resend SDK unavailable", {
          error: error instanceof Error ? error.message : error,
        });
        return null;
      });
  }

  return resendClientPromise;
};

const normalizeRecipients = (input) => {
  const values = Array.isArray(input) ? input : [input];

  return [...new Set(
    values
      .flatMap((value) => {
        if (!value) {
          return [];
        }

        if (typeof value === "string") {
          return value.split(",");
        }

        return [];
      })
      .map((value) => value.trim().toLowerCase())
      .filter((value) => EMAIL_REGEX.test(value)),
  )];
};

export const isMailConfigured = () => {
  return Boolean(env.resendApiKey && env.mailFrom);
};

export const sendEmail = async ({ to, subject, html }) => {
  const recipients = normalizeRecipients(to);

  if (recipients.length === 0) {
    return { sent: false, reason: "no_recipients" };
  }

  if (!isMailConfigured()) {
    console.warn("[mail] Skipped send: Resend not configured", {
      subject,
      recipients,
    });
    return { sent: false, reason: "not_configured" };
  }

  const resendClient = await getResendClient();

  if (!resendClient) {
    return { sent: false, reason: "provider_unavailable" };
  }

  try {
    const response = await resendClient.emails.send({
      from: env.mailFrom,
      to: recipients,
      subject,
      html,
      ...(env.mailReplyTo ? { replyTo: env.mailReplyTo } : {}),
    });

    if (response?.error) {
      throw new Error(response.error.message || "Email provider returned an error");
    }

    return {
      sent: true,
      id: response?.data?.id || null,
      recipients,
    };
  } catch (error) {
    console.error("[mail] Failed to send email", {
      subject,
      recipients,
      error: error instanceof Error ? error.message : error,
    });
    return { sent: false, reason: "provider_error" };
  }
};
