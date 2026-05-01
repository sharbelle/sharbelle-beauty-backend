import asyncHandler from "../helpers/asyncHandler.js";
import sendResponse from "../helpers/sendResponse.js";
import {
  exportWaitlistAsCsv,
  listWaitlistEntries,
  subscribeToWaitlist,
} from "../services/waitlist.service.js";

export const subscribe = asyncHandler(async (req, res) => {
  const { entry, wasCreated } = await subscribeToWaitlist(req.body);

  return sendResponse(res, {
    statusCode: wasCreated ? 201 : 200,
    message: wasCreated ? "Successfully joined waitlist" : "Email is already on the waitlist",
    data: {
      waitlist: entry,
      wasCreated,
    },
  });
});

export const getAdminWaitlist = asyncHandler(async (req, res) => {
  const { items, meta } = await listWaitlistEntries(req.query);

  return sendResponse(res, {
    message: "Waitlist fetched",
    data: {
      waitlist: items,
    },
    meta,
  });
});

export const exportAdminWaitlistCsv = asyncHandler(async (req, res) => {
  const csv = await exportWaitlistAsCsv(req.query);
  const dateStamp = new Date().toISOString().slice(0, 10);

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="waitlist-${dateStamp}.csv"`);
  return res.status(200).send(csv);
});
