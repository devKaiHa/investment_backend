const mongoose = require("mongoose");

const sharesHolderModal = new mongoose.Schema(
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

    shares: { type: Number, required: true, min: 0, default: 0 },
  },
  { timestamps: true }
);

// One row per holder per asset
sharesHolderModal.index(
  { holderType: 1, holderId: 1, assetType: 1, assetId: 1 },
  { unique: true }
);

module.exports = mongoose.model("shareHolder", sharesHolderModal);
