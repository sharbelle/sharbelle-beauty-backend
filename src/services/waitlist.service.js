import { WaitlistEntryModel } from "../models/waitlist.model.js";
import { toPaginationMeta, toSkipValue } from "../utils/pagination.js";

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const normalizeEmail = (value) => value.trim().toLowerCase();

const serializeWaitlistEntry = (entry) => {
  return entry?.toJSON ? entry.toJSON() : entry;
};

const buildWaitlistSearchQuery = (search) => {
  if (!search?.trim()) {
    return {};
  }

  const pattern = new RegExp(escapeRegex(search.trim()), "i");
  return {
    $or: [{ email: pattern }, { fullName: pattern }, { source: pattern }],
  };
};

export const subscribeToWaitlist = async ({ email, fullName, source }) => {
  const normalizedEmail = normalizeEmail(email);
  const trimmedName = fullName?.trim() || "";
  const trimmedSource = source?.trim() || "website";

  const existing = await WaitlistEntryModel.findOne({ email: normalizedEmail });
  if (existing) {
    return {
      entry: serializeWaitlistEntry(existing),
      wasCreated: false,
    };
  }

  try {
    const created = await WaitlistEntryModel.create({
      email: normalizedEmail,
      fullName: trimmedName,
      source: trimmedSource,
    });

    return {
      entry: serializeWaitlistEntry(created),
      wasCreated: true,
    };
  } catch (error) {
    if (error?.code === 11000) {
      const alreadyExists = await WaitlistEntryModel.findOne({ email: normalizedEmail });
      return {
        entry: serializeWaitlistEntry(alreadyExists),
        wasCreated: false,
      };
    }

    throw error;
  }
};

export const listWaitlistEntries = async (filters = {}) => {
  const { search, page = 1, limit = 20 } = filters;
  const query = buildWaitlistSearchQuery(search);
  const skip = toSkipValue(page, limit);

  const [totalItems, entries] = await Promise.all([
    WaitlistEntryModel.countDocuments(query),
    WaitlistEntryModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
  ]);

  return {
    items: entries.map((entry) => serializeWaitlistEntry(entry)),
    meta: toPaginationMeta({
      page,
      limit,
      totalItems,
    }),
  };
};

const toCsvCell = (value) => {
  const text = value === undefined || value === null ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
};

export const exportWaitlistAsCsv = async (filters = {}) => {
  const { search } = filters;
  const query = buildWaitlistSearchQuery(search);
  const entries = await WaitlistEntryModel.find(query).sort({ createdAt: -1 }).limit(10000).lean();

  const header = ["Email", "Full Name", "Source", "Joined At (UTC)"];
  const rows = entries.map((entry) => [
    entry.email || "",
    entry.fullName || "",
    entry.source || "",
    entry.createdAt ? new Date(entry.createdAt).toISOString() : "",
  ]);

  return [header, ...rows]
    .map((row) => row.map((cell) => toCsvCell(cell)).join(","))
    .join("\n");
};
