const mongoose = require("mongoose");

const investmentFundSchema = new mongoose.Schema(
  {
    // Fund Information
    fullLegalName: {
      type: String,
      required: true,
      trim: true,
    },
    nameAr: { type: String, trim: true, default: "" },

    logo: { type: String, default: "" },

    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      unique: true,
      index: true,
    },

    // Pricing
    sharePrice: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },

    initialShares: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },

    minInvestShare: {
      type: Number,
      required: true,
      default: 1,
      min: 1,
    },

    maxInvestShare: {
      type: Number,
      required: true,
      default: 1,
      min: 1,
    },

    // Status
    shareIssued: {
      type: Boolean,
      default: false,
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("InvestmentFund", investmentFundSchema);
