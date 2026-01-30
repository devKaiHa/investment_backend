const mongoose = require("mongoose");

const shareTradeRequestLogSchema = new mongoose.Schema(
  {
    tradeRequest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ShareTradeRequest",
      required: true,
    },

    action: {
      type: String,
      enum: ["created", "approved", "rejected", "confirmed", "updated"],
      required: true,
    },

    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "performedByType",
    },

    performedByType: {
      type: String,
      enum: ["Investor", "Admin", "System"],
      required: true,
    },

    previousStatus: {
      type: String,
    },

    newStatus: {
      type: String,
    },

    note: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model(
  "ShareTradeRequestLog",
  shareTradeRequestLogSchema,
);
