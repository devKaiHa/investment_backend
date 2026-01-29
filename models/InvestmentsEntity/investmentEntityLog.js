const mongoose = require("mongoose");

const investmentEntityLogSchema = new mongoose.Schema(
  {
    // Which entity is affected
    entityType: {
      type: String,
      enum: ["ClientCompany", "InvestmentFund"],
      required: true,
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "entityType",
      index: true,
    },

    // Who did the action (admin / employee)
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
      index: true,
    },

    // What happened
    action: {
      type: String,
      enum: ["ISSUE_SHARES", "UPDATE_INVEST_INFO"],
      required: true,
    },

    // Field changes (diff)
    changes: [
      {
        field: { type: String, required: true },
        before: { type: String, default: "" },
        after: { type: String, default: "" },
      },
    ],

    // Optional notes (multilingual)
    note: {
      en: { type: String, default: "" },
      ar: { type: String, default: "" },
    },
  },
  { timestamps: true }
);

// Fast history lookup
investmentEntityLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });

module.exports = mongoose.model(
  "InvestmentEntityLog",
  investmentEntityLogSchema
);
