const mongoose = require("mongoose");

// ============================
// ============================
// DEPRECATING, KEPT FOR REFERENCE
// ============================
// ============================
const sharePurchaseRequestModel = new mongoose.Schema(
  {
    investorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "investors",
    },
    type: String,
    shares: Number,
    sharePrice: Number,
    description: { type: String, default: "" },
    companyId: String,
    paymentStatus: { type: String, default: "unpaid" },
    status: { type: String, default: "pending" },
    seller: { type: mongoose.Schema.Types.ObjectId, ref: "ClientCompany" },
    rejectionReason: { type: String, default: "" },
  },
  { timestamps: true },
);

module.exports = mongoose.model(
  "SharePurchaseRequest",
  sharePurchaseRequestModel,
);
