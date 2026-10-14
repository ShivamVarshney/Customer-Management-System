const mongoose = require("mongoose");
const Customer = require("../Models/Customer");
const Workspace = require("../Models/Workspace");
const WorkspaceMembership = require("../Models/WorkspaceMembership");

async function ensurePersonalWorkspace(userId) {
  const ownerId = new mongoose.Types.ObjectId(userId);
  let workspace = await Workspace.findOne({ personalFor: ownerId });

  if (!workspace) {
    try {
      workspace = await Workspace.create({ name: "My Workspace", createdBy: ownerId, personalFor: ownerId });
    } catch (error) {
      // A concurrent first request may have created this user's unique default.
      if (error?.code !== 11000) throw error;
      workspace = await Workspace.findOne({ personalFor: ownerId });
      if (!workspace) throw error;
    }
  }

  try {
    await WorkspaceMembership.updateOne(
      { workspaceId: workspace._id, userId: ownerId },
      { $setOnInsert: { role: "owner" } },
      { upsert: true }
    );
  } catch (error) {
    if (error?.code !== 11000 || !await WorkspaceMembership.findOne({ workspaceId: workspace._id, userId: ownerId })) throw error;
  }

  // Safe, idempotent legacy mapping: attach only records already owned by this user.
  // Ownerless or differently owned records remain untouched and inaccessible.
  await Customer.updateMany(
    { userId: ownerId, workspaceId: { $in: [null] } },
    { $set: { workspaceId: workspace._id } }
  );

  return workspace;
}

module.exports = { ensurePersonalWorkspace };
