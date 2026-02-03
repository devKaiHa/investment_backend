const mongoose = require("mongoose");

const shareTransactionModel = new mongoose.Schema(
  {
    holderType: {
      type: String,
      enum: ["investors", "InvestmentFund"],
      required: true,
    },
    holderId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "holderType",
      index: true,
    },

    assetType: {
      type: String,
      enum: ["ClientCompany", "InvestmentFund"],
      required: true,
    },
    assetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "assetType",
      index: true,
    },

    type: {
      type: String,
      enum: ["ISSUE", "TRANSFER", "ADJUST", "REDEEM"],
      required: true,
    },
    side: {
      type: String,
      enum: ["buy", "sell"],
      required: function () {
        return this.type === "TRANSFER";
      },
    },
    quantity: { type: Number, required: true, min: 1 },
    pricePerShare: { type: Number, required: true, min: 0 },

    // optional links
    tradeRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ShareTradeRequest",
      default: null,
    },
    note: { type: String, default: "" },
  },
  { timestamps: true }
);

shareTransactionModel.index({
  holderType: 1,
  holderId: 1,
  assetType: 1,
  assetId: 1,
  createdAt: -1,
});

module.exports = mongoose.model("ShareTransaction", shareTransactionModel);
