const mongoose = require("mongoose");

const investorHoldingSchema = new mongoose.Schema(
  {
    investor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "investors",
      required: true,
      index: true,
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ClientCompany",
      required: true,
      index: true,
    },
    shares: { type: Number, required: true, min: 0, default: 0 },
  },
  { timestamps: true }
);

// One holding row per investor per company
investorHoldingSchema.index({ investor: 1, company: 1 }, { unique: true });

module.exports = mongoose.model("InvestorHolding", investorHoldingSchema);
