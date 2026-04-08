import { ORDER_STATUS_LABELS, TRACKING_PROGRESS_FLOW } from "../config/constants.js";

const TERMINAL_STATUSES = new Set(["cancelled", "returned"]);

export const buildStatusSteps = (currentStatus) => {
  const currentIndex = TRACKING_PROGRESS_FLOW.indexOf(currentStatus);

  const steps = TRACKING_PROGRESS_FLOW.map((status, index) => ({
    status,
    label: ORDER_STATUS_LABELS[status],
    completed: currentIndex > -1 ? index <= currentIndex : false,
    active: index === currentIndex,
  }));

  if (currentStatus === "cancelled") {
    return {
      percent: 0,
      state: "cancelled",
      steps,
    };
  }

  if (currentStatus === "returned") {
    return {
      percent: 100,
      state: "returned",
      steps,
    };
  }

  if (currentIndex === -1) {
    return {
      percent: 0,
      state: "unknown",
      steps,
    };
  }

  const percent = Math.round((currentIndex / (TRACKING_PROGRESS_FLOW.length - 1)) * 100);

  return {
    percent,
    state: "active",
    steps,
  };
};

export const isTerminalStatus = (status) => TERMINAL_STATUSES.has(status);
