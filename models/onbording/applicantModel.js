const mongoose = require("mongoose");

const applicantSchema = new mongoose.Schema(
  {
    authUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AuthUser",
      required: true,
      unique: true,
    },
    fullName: String,
    latinName: String,
    slug: { type: String, lowercase: true },
    email: String,
    phone: String,
    countryCode: { type: String, uppercase: true },
    birthDate: String,

    reviewStatus: {
      type: String,
      enum: ["draft", "pending", "approved", "rejected"],
      default: "draft",
    },
    rejectionReason: String,
    idPhoto: String,
    livePhoto: String,
    passportNumber: String,
    idNumber: String,
    profileImage: String,
    kycPayment: {
      method: {
        type: String,
        enum: ["bank", "shamcash", "usdt"],
      },

      // Bank transfer in Syria
      bank: {
        beneficiaryFullName: String,
        beneficiaryAddress: String,
        bankName: String,
        accountNumber: String,
        transferReason: String,
        amount: Number,
      },

      // Sham Cash
      shamCash: {
        accountNumber: String,
        qrCode: String,
        beneficiaryName: String,
        beneficiaryAddress: String,
      },

      // USDT
      usdt: {
        transferNetwork: String,
        walletAddress: String,
        walletQr: String,
      },
    },
    role: { type: String, default: "applicant" },

    deletable: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("applicant", applicantSchema);
