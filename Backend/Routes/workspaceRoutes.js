const express = require("express");
const mongoose = require("mongoose");
const protect = require("../Middleware/authMiddleware");
const Workspace = require("../Models/Workspace");
const WorkspaceMembership = require("../Models/WorkspaceMembership");
const { ensurePersonalWorkspace } = require("../Services/workspaceService");

const router = express.Router();
const objectIdPattern = /^[a-f\d]{24}$/i;
router.use(protect);

const toPublicWorkspace = (workspace, role, userId) => ({
  id: String(workspace._id),
  name: workspace.name,
  role,
  isDefault: String(workspace.personalFor || "") === String(userId),
});

router.get("/", async (req, res) => {
  try {
    const personalWorkspace = await ensurePersonalWorkspace(req.user.id);
    const memberships = await WorkspaceMembership.find({ userId: req.user.id });
    const workspaceIds = memberships.map((membership) => membership.workspaceId);
    const workspaces = await Workspace.find({ _id: { $in: workspaceIds } });
    const byId = new Map(workspaces.map((workspace) => [String(workspace._id), workspace]));
    const response = memberships
      .map((membership) => {
        const workspace = byId.get(String(membership.workspaceId));
        return workspace ? toPublicWorkspace(workspace, membership.role, req.user.id) : null;
      })
      .filter(Boolean);

    if (!response.some((workspace) => workspace.id === String(personalWorkspace._id))) {
      response.unshift(toPublicWorkspace(personalWorkspace, "owner", req.user.id));
    }
    return res.json({ success: true, workspaces: response });
  } catch {
    return res.status(500).json({ success: false, message: "Failed to list workspaces" });
  }
});

router.post("/", async (req, res) => {
  const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
  if (!name || name.length > 80) return res.status(400).json({ success: false, message: "Workspace name must be between 1 and 80 characters" });

  let workspace;
  try {
    workspace = await Workspace.create({ name, createdBy: req.user.id });
    const membership = await WorkspaceMembership.create({ workspaceId: workspace._id, userId: req.user.id, role: "owner" });
    return res.status(201).json({ success: true, workspace: toPublicWorkspace(workspace, membership.role, req.user.id) });
  } catch (error) {
    if (workspace?._id) {
      try { await Workspace.deleteOne({ _id: workspace._id, createdBy: req.user.id }); } catch { /* Keep the client response safe. */ }
    }
    return res.status(error?.name === "ValidationError" ? 400 : 500).json({ success: false, message: error?.name === "ValidationError" ? "Invalid workspace details" : "Failed to create workspace" });
  }
});

router.post("/:workspaceId/activate", async (req, res) => {
  const { workspaceId } = req.params;
  if (!objectIdPattern.test(workspaceId) || !mongoose.isValidObjectId(workspaceId)) {
    return res.status(400).json({ success: false, message: "Invalid workspace ID" });
  }

  try {
    const membership = await WorkspaceMembership.findOne({ workspaceId, userId: req.user.id });
    if (!membership) return res.status(403).json({ success: false, message: "You do not have access to this workspace" });
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) return res.status(404).json({ success: false, message: "Workspace not found" });
    return res.json({ success: true, workspace: toPublicWorkspace(workspace, membership.role, req.user.id) });
  } catch {
    return res.status(500).json({ success: false, message: "Failed to activate workspace" });
  }
});

module.exports = router;
