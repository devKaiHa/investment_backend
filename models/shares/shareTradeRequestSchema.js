const mongoose = require("mongoose");

const shareTradeRequestSchema = new mongoose.Schema(
  {
    investor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "investors",
      required: true,
    },

    tradeType: {
      type: String,
      enum: ["buy", "sell"],
      required: true,
    },

    sourceType: {
      type: String,
      enum: ["ClientCompany", "InvestmentFund"],
      required: true,
    },

    source: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "sourceType",
    },

    numberOfShares: {
      type: Number,
      required: true,
      min: 1,
    },

    pricePerShare: {
      type: Number,
      required: true,
      min: 0,
    },

    description: {
      type: String,
      default: "",
    },

    paymentStatus: {
      type: String,
      enum: ["unpaid", "paid"],
      default: "unpaid",
    },

    requestStatus: {
      type: String,
      enum: ["pending", "approved", "payment_pending", "confirmed", "rejected"],
      default: "pending",
    },

    rejectionReason: {
      type: String,
      default: "",
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("ShareTradeRequest", shareTradeRequestSchema);
