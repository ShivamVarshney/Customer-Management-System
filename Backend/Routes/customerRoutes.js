const express = require("express");
const mongoose = require("mongoose");
const Customer = require("../Models/Customer.js");
const protect = require("../Middleware/authMiddleware.js");
const requireWorkspace = require("../Middleware/workspaceMiddleware.js");

const router = express.Router();
const statuses = ["Active", "Pending", "Inactive"];
const leadStages = ["New Lead", "Contacted", "Qualified", "Proposal Sent", "Won", "Lost"];
const priorities = ["Low", "Normal", "High"];
const fields = ["name", "phone", "email", "address", "status", "leadStage", "companyName", "jobTitle", "country", "state", "city", "leadSource", "priority", "notes", "nextFollowUpDate"];
const objectIdPattern = /^[a-f\d]{24}$/i;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^\+?[\d()\-.\s]{5,30}$/;
const exportColumns = ["customerId", "name", "email", "phone", "address", "status", "leadStage", "companyName", "jobTitle", "country", "state", "city", "leadSource", "priority", "notes", "nextFollowUpDate", "createdAt"];
router.use(protect, requireWorkspace);

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const invalidId = (id) => !objectIdPattern.test(id) || !mongoose.isValidObjectId(id);
const handleFailure = (res, error, fallback) => res.status(error?.name === "ValidationError" || error?.name === "CastError" ? 400 : 500).json({ message: error?.name === "ValidationError" || error?.name === "CastError" ? "Invalid customer data" : fallback });

const validateCustomer = (body) => {
  if (!body || typeof body !== "object" || Array.isArray(body)) return { message: "A customer object is required" };
  const data = {};
  for (const field of fields) if (body[field] !== undefined) data[field] = body[field];
  for (const field of ["name", "phone", "email", "address"]) {
    if (typeof data[field] !== "string" || !data[field].trim()) return { message: `${field} is required` };
    data[field] = data[field].trim();
  }
  if (data.name.length > 120 || data.address.length > 500) return { message: "Name or address is too long" };
  if (!emailPattern.test(data.email) || data.email.length > 254) return { message: "A valid email address is required" };
  if (!phonePattern.test(data.phone)) return { message: "A valid phone number is required" };
  if (data.status !== undefined && !statuses.includes(data.status)) return { message: "Invalid customer account status" };
  if (data.leadStage !== undefined && !leadStages.includes(data.leadStage)) return { message: "Invalid lead stage" };
  if (data.priority !== undefined && !priorities.includes(data.priority)) return { message: "Invalid priority" };
  const limits = { companyName: 160, jobTitle: 120, country: 100, state: 100, city: 100, leadSource: 100, notes: 2000 };
  for (const [field, limit] of Object.entries(limits)) {
    if (data[field] !== undefined && typeof data[field] !== "string") return { message: `${field} must be text` };
    if (data[field] !== undefined) data[field] = data[field].trim();
    if (data[field]?.length > limit) return { message: `${field} is too long` };
  }
  if (data.nextFollowUpDate !== undefined && data.nextFollowUpDate !== "") {
    const date = new Date(data.nextFollowUpDate);
    if (Number.isNaN(date.getTime())) return { message: "Invalid next follow-up date" };
    data.nextFollowUpDate = date;
  } else if (data.nextFollowUpDate === "") data.nextFollowUpDate = null;
  data.email = data.email.toLowerCase();
  data.status = data.status || "Pending";
  data.leadStage = data.leadStage || "New Lead";
  data.priority = data.priority || "Normal";
  return { data };
};

const buildCustomerQuery = (filters, workspaceId) => {
  const { search = "", status = "All", leadStage = "All" } = filters;
  if (typeof search !== "string" || search.length > 100) return { message: "Search must be 100 characters or fewer" };
  if (typeof status !== "string" || (status !== "All" && !statuses.includes(status))) return { message: "Invalid customer status filter" };
  if (typeof leadStage !== "string" || (leadStage !== "All" && !leadStages.includes(leadStage))) return { message: "Invalid lead stage filter" };

  const query = { workspaceId };
  const clauses = [];
  if (status !== "All") query.status = status;
  if (leadStage === "New Lead") clauses.push({ $or: [{ leadStage: "New Lead" }, { leadStage: { $exists: false } }, { leadStage: null }, { leadStage: "" }] });
  else if (leadStage !== "All") query.leadStage = leadStage;
  if (search.trim()) {
    const regex = new RegExp(escapeRegex(search.trim()), "i");
    clauses.push({ $or: ["name", "email", "phone", "companyName"].map((field) => ({ [field]: regex })) });
  }
  if (clauses.length) query.$and = clauses;
  return { query };
};

router.post("/export", async (req, res) => {
  const { scope, columns, countOnly = false } = req.body || {};
  if (!["all", "filtered", "selected"].includes(scope)) return res.status(400).json({ message: "Choose a valid export scope" });
  if (!countOnly && (!Array.isArray(columns) || columns.length < 1 || columns.length > exportColumns.length || columns.some((column) => !exportColumns.includes(column)) || new Set(columns).size !== columns.length)) {
    return res.status(400).json({ message: "Choose valid export columns" });
  }

  let query = { workspaceId: req.workspaceId };
  if (scope === "filtered") {
    const result = buildCustomerQuery(req.body.filters || {}, req.workspaceId);
    if (result.message) return res.status(400).json({ message: result.message });
    query = result.query;
  }
  if (scope === "selected") {
    const { selectedIds } = req.body;
    if (!Array.isArray(selectedIds) || selectedIds.length < 1 || selectedIds.length > 1000 || selectedIds.some(invalidId)) {
      return res.status(400).json({ message: "Select between 1 and 1000 valid customers" });
    }
    query._id = { $in: [...new Set(selectedIds)] };
  }

  try {
    if (countOnly) {
      const recordCount = await Customer.countDocuments(query);
      return res.json({ success: true, recordCount });
    }
    const projection = [...new Set(columns.map((column) => column === "customerId" ? "_id" : column))].join(" ");
    const documents = await Customer.find(query).select(projection).sort({ createdAt: -1 });
    const customers = documents.map((document) => {
      const source = document.toObject ? document.toObject() : document;
      return Object.fromEntries(columns.map((column) => [column, column === "customerId" ? String(source._id) : (source[column] ?? "")]));
    });
    return res.json({ success: true, recordCount: customers.length, customers });
  } catch (error) {
    return handleFailure(res, error, "Failed to prepare customer export");
  }
});

router.get("/", async (req, res) => {
  try {
    const { search = "", status = "All", leadStage = "All", sortBy = "createdAt", sortOrder = "desc" } = req.query;
    if (!new Set(["createdAt", "name"]).has(sortBy) || !new Set(["asc", "desc"]).has(sortOrder)) return res.status(400).json({ message: "Invalid sorting options" });
    const page = Number.parseInt(req.query.page ?? "1", 10);
    const limit = Number.parseInt(req.query.limit ?? "10", 10);
    if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 100) return res.status(400).json({ message: "Invalid pagination values" });
    const result = buildCustomerQuery({ search, status, leadStage }, req.workspaceId);
    if (result.message) return res.status(400).json({ message: result.message });

    const sort = { [sortBy]: sortOrder === "asc" ? 1 : -1 };
    const [customers, total] = await Promise.all([
      Customer.find(result.query).sort(sort).skip((page - 1) * limit).limit(limit),
      Customer.countDocuments(result.query),
    ]);
    return res.json({ success: true, customers, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) { return handleFailure(res, error, "Failed to fetch customers"); }
});

router.get("/:id", async (req, res) => {
  if (invalidId(req.params.id)) return res.status(400).json({ message: "Invalid customer ID" });
  try {
    const customer = await Customer.findOne({ _id: req.params.id, workspaceId: req.workspaceId });
    if (!customer) return res.status(404).json({ message: "Customer not found" });
    return res.json({ success: true, customer });
  } catch (error) { return handleFailure(res, error, "Failed to fetch customer"); }
});

router.post("/", async (req, res) => {
  const validation = validateCustomer(req.body);
  if (validation.message) return res.status(400).json({ message: validation.message });
  try {
    const customer = await Customer.create({ ...validation.data, userId: req.user.id, workspaceId: req.workspaceId });
    return res.status(201).json({ success: true, message: "Customer added successfully", customer });
  } catch (error) { return handleFailure(res, error, "Failed to add customer"); }
});

router.put("/:id", async (req, res) => {
  if (invalidId(req.params.id)) return res.status(400).json({ message: "Invalid customer ID" });
  const validation = validateCustomer(req.body);
  if (validation.message) return res.status(400).json({ message: validation.message });
  try {
    const customer = await Customer.findOneAndUpdate({ _id: req.params.id, workspaceId: req.workspaceId }, { $set: validation.data }, { new: true, runValidators: true, context: "query" });
    if (!customer) return res.status(404).json({ message: "Customer not found" });
    return res.json({ success: true, message: "Customer updated successfully", customer });
  } catch (error) { return handleFailure(res, error, "Failed to update customer"); }
});

router.delete("/:id", async (req, res) => {
  if (invalidId(req.params.id)) return res.status(400).json({ message: "Invalid customer ID" });
  try {
    const customer = await Customer.findOneAndDelete({ _id: req.params.id, workspaceId: req.workspaceId });
    if (!customer) return res.status(404).json({ message: "Customer not found" });
    return res.json({ success: true, message: "Customer deleted successfully" });
  } catch (error) { return handleFailure(res, error, "Failed to delete customer"); }
});

module.exports = router;
