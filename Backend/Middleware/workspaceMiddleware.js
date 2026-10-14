const mongoose = require("mongoose");
const WorkspaceMembership = require("../Models/WorkspaceMembership");
const { ensurePersonalWorkspace } = require("../Services/workspaceService");

const objectIdPattern = /^[a-f\d]{24}$/i;

async function requireWorkspace(req, res, next) {
  try {
    const requestedId = req.get("X-Workspace-Id");
    if (requestedId && (!objectIdPattern.test(requestedId) || !mongoose.isValidObjectId(requestedId))) {
      return res.status(400).json({ success: false, message: "Invalid workspace ID" });
    }

    const personalWorkspace = await ensurePersonalWorkspace(req.user.id);
    let workspaceId = personalWorkspace._id;
    let membership;

    if (requestedId) {
      workspaceId = new mongoose.Types.ObjectId(requestedId);
      membership = await WorkspaceMembership.findOne({ workspaceId, userId: req.user.id });
      if (!membership) {
        return res.status(403).json({ success: false, message: "You do not have access to this workspace" });
      }
    } else {
      membership = await WorkspaceMembership.findOne({ workspaceId, userId: req.user.id });
      if (!membership) return res.status(403).json({ success: false, message: "Workspace membership is required" });
    }

    req.workspace = { id: workspaceId, role: membership.role };
    req.workspaceId = workspaceId;
    return next();
  } catch {
    return res.status(500).json({ success: false, message: "Unable to verify workspace access" });
  }
}

module.exports = requireWorkspace;
