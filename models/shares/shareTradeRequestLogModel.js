const mongoose = require("mongoose");

const shareTradeRequestLogModel = new mongoose.Schema(
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

    performedByType: {
      type: String,
      enum: ["investors", "Employee"],
      required: true,
    },

    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      // required: true,
      refPath: "performedByType",
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
  }
);

module.exports = mongoose.model(
  "ShareTradeRequestLog",
  shareTradeRequestLogModel
);
