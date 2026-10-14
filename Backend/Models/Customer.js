const mongoose = require("mongoose");

const leadStages = ["New Lead", "Contacted", "Qualified", "Proposal Sent", "Won", "Lost"];

const customerSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      select: false,
    },
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
      select: false,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    address: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["Active", "Pending", "Inactive"],
      default: "Pending",
    },
    leadStage: {
      type: String,
      enum: leadStages,
      default: "New Lead",
    },
    companyName: { type: String, trim: true, maxlength: 160, default: "" },
    jobTitle: { type: String, trim: true, maxlength: 120, default: "" },
    country: { type: String, trim: true, maxlength: 100, default: "" },
    state: { type: String, trim: true, maxlength: 100, default: "" },
    city: { type: String, trim: true, maxlength: 100, default: "" },
    leadSource: { type: String, trim: true, maxlength: 100, default: "" },
    priority: { type: String, enum: ["Low", "Normal", "High"], default: "Normal" },
    notes: { type: String, trim: true, maxlength: 2000, default: "" },
    nextFollowUpDate: { type: Date, default: null },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_document, result) {
        delete result.userId;
        delete result.workspaceId;
        return result;
      },
    },
  }
);

customerSchema.index({ workspaceId: 1, createdAt: -1 });
customerSchema.index({ workspaceId: 1, status: 1 });

// ⭐ Ye line OverwriteModelError fix karegi
module.exports =
  mongoose.models.Customer ||
  mongoose.model("Customer", customerSchema);
