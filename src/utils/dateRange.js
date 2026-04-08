const toStartOfDay = (date) => {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
};

const toEndOfDay = (date) => {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
};

const parseYmdDate = (value, endOfDay = false) => {
  if (!value) {
    return null;
  }

  const parsed = new Date(`${value}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return endOfDay ? toEndOfDay(parsed) : toStartOfDay(parsed);
};

export const resolveDateRange = ({ datePreset = "all", dateFrom, dateTo } = {}) => {
  const now = new Date();
  const startOfToday = toStartOfDay(now);
  const endOfToday = toEndOfDay(now);
  let start = null;
  let end = null;

  if (datePreset === "today") {
    start = startOfToday;
    end = endOfToday;
  } else if (datePreset === "last_7_days") {
    start = new Date(startOfToday);
    start.setDate(start.getDate() - 6);
    end = endOfToday;
  } else if (datePreset === "last_30_days") {
    start = new Date(startOfToday);
    start.setDate(start.getDate() - 29);
    end = endOfToday;
  } else if (datePreset === "this_month") {
    start = new Date(startOfToday);
    start.setDate(1);
    end = endOfToday;
  }

  const explicitFrom = parseYmdDate(dateFrom, false);
  const explicitTo = parseYmdDate(dateTo, true);

  if (explicitFrom) {
    start = explicitFrom;
  }

  if (explicitTo) {
    end = explicitTo;
  }

  if (!start && !end) {
    return null;
  }

  if (!start) {
    start = new Date(0);
  }

  if (!end) {
    end = toEndOfDay(now);
  }

  if (start.getTime() > end.getTime()) {
    return {
      start: end,
      end: start,
    };
  }

  return { start, end };
};
