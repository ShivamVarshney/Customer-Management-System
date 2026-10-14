const express = require("express");
const Customer = require("../Models/Customer.js");
const protect = require("../Middleware/authMiddleware.js");
const requireWorkspace = require("../Middleware/workspaceMiddleware.js");

const router = express.Router();

router.use(protect, requireWorkspace);

const analyticsStages = ["New Lead", "Contacted", "Qualified", "Proposal Sent", "Won", "Lost"];

const parseDateRange = (query, now = new Date()) => {
  const hasFrom = query.from !== undefined;
  const hasTo = query.to !== undefined;
  const validDate = (value) => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`)) && new Date(`${value}T00:00:00.000Z`).toISOString().slice(0, 10) === value;

  if ((hasFrom && !validDate(query.from)) || (hasTo && !validDate(query.to))) return { error: "Dates must use YYYY-MM-DD format" };

  const defaultStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1));
  const defaultEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const start = hasFrom ? new Date(`${query.from}T00:00:00.000Z`) : defaultStart;
  const endDate = hasTo ? new Date(`${query.to}T00:00:00.000Z`) : defaultEnd;
  if (start > endDate) return { error: "The start date must be on or before the end date" };

  const endExclusive = new Date(endDate);
  endExclusive.setUTCDate(endExclusive.getUTCDate() + 1);
  const maxRange = new Date(start);
  maxRange.setUTCMonth(maxRange.getUTCMonth() + 24);
  if (endExclusive > maxRange) return { error: "Choose a date range of 24 months or less" };

  const months = [];
  const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
  const lastMonth = new Date(Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), 1));
  while (cursor <= lastMonth) {
    months.push({
      key: `${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, "0")}`,
      month: cursor.toLocaleDateString("en", { month: "short", year: "numeric", timeZone: "UTC" }),
      count: 0,
    });
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }

  return { start, endExclusive, months };
};

router.get("/analytics", async (req, res) => {
  const range = parseDateRange(req.query);
  if (range.error) return res.status(400).json({ success: false, message: range.error });

  try {
    const [result] = await Customer.aggregate([
      { $match: { workspaceId: req.workspaceId, createdAt: { $gte: range.start, $lt: range.endExclusive } } },
      { $facet: {
        monthly: [{ $group: { _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } }, count: { $sum: 1 } } }],
        statuses: [{ $group: { _id: "$status", count: { $sum: 1 } } }],
        stages: [{ $group: { _id: { $ifNull: ["$leadStage", "New Lead"] }, count: { $sum: 1 } } }],
      } },
    ]);
    const monthlyCounts = new Map((result?.monthly || []).map(({ _id, count }) => [_id, count]));
    const statusCounts = new Map((result?.statuses || []).map(({ _id, count }) => [_id, count]));
    const stageCounts = new Map((result?.stages || []).map(({ _id, count }) => [_id || "New Lead", count]));
    const monthlyGrowth = range.months.map((month) => ({ ...month, count: monthlyCounts.get(month.key) || 0 }));
    const statusDistribution = ["Active", "Pending", "Inactive"].map((name) => ({ name, value: statusCounts.get(name) || 0 }));
    const leadStageDistribution = analyticsStages.map((name) => ({ name, value: stageCounts.get(name) || 0 }));

    return res.json({
      success: true,
      range: { from: range.start.toISOString().slice(0, 10), to: new Date(range.endExclusive.getTime() - 1).toISOString().slice(0, 10) },
      total: statusDistribution.reduce((sum, item) => sum + item.value, 0),
      monthlyGrowth,
      statusDistribution,
      leadStageDistribution,
    });
  } catch {
    return res.status(500).json({ success: false, message: "Failed to fetch analytics" });
  }
});

router.get("/stats", async (req, res) => {
  try {
    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1));
    const months = Array.from({ length: 6 }, (_, index) => {
      const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5 + index, 1));
      return { key: `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`, month: date.toLocaleDateString("en", { month: "short", year: "numeric", timeZone: "UTC" }), count: 0 };
    });
    const [result] = await Customer.aggregate([
      { $match: { workspaceId: req.workspaceId } },
      { $facet: {
        summary: [{ $group: { _id: null, total: { $sum: 1 }, active: { $sum: { $cond: [{ $eq: ["$status", "Active"] }, 1, 0] } }, pending: { $sum: { $cond: [{ $eq: ["$status", "Pending"] }, 1, 0] } }, inactive: { $sum: { $cond: [{ $eq: ["$status", "Inactive"] }, 1, 0] } } } }],
        monthly: [{ $match: { createdAt: { $gte: monthStart } } }, { $group: { _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } }, count: { $sum: 1 } } }],
        stages: [{ $group: { _id: { $ifNull: ["$leadStage", "New Lead"] }, count: { $sum: 1 } } }],
        recent: [{ $sort: { createdAt: -1 } }, { $limit: 5 }, { $project: { userId: 0 } }],
      } },
    ]);
    const summary = result?.summary?.[0] || {};
    const monthlyCounts = new Map((result?.monthly || []).map(({ _id, count }) => [_id, count]));
    const leadCounts = new Map((result?.stages || []).map(({ _id, count }) => [_id || "New Lead", count]));
    const stageNames = ["New Lead", "Contacted", "Qualified", "Proposal Sent", "Won", "Lost"];
    return res.json({
      success: true,
      total: summary.total || 0,
      active: summary.active || 0,
      pending: summary.pending || 0,
      inactive: summary.inactive || 0,
      monthlyGrowth: months.map((month) => ({ ...month, count: monthlyCounts.get(month.key) || 0 })),
      statusDistribution: [
        { name: "Active", value: summary.active || 0 },
        { name: "Pending", value: summary.pending || 0 },
        { name: "Inactive", value: summary.inactive || 0 },
      ],
      leadStageDistribution: stageNames.map((name) => ({ name, value: leadCounts.get(name) || 0 })),
      recentCustomers: result?.recent || [],
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard stats",
    });
  }
});

module.exports = router;
