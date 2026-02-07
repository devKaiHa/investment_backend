const mongoose = require("mongoose");

const investorSchema = new mongoose.Schema(
  {
    authUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AuthUser",
      // required: true,
      // unique: true,
    },
    fullName: String,
    nationalId: {
      type: String,
      unique: true,
      index: true,
      trim: true,
    },
    passportId: {
      type: String,
      index: true,
      trim: true,
    },
    passportExpDate: String,
    latinName: String,
    slug: { type: String, lowercase: true },
    email: String,
    phone: String,
    birthDate: String,
    ibanNumbers: [
      {
        bankName: String,
        iban: String,
      },
    ],
    idPhoto: String,
    livePhoto: String,
    profileImage: String,
    kycPayment: {
      method: {
        type: String,
        enum: ["bank", "shamCash", "usdt"],
      },
      bank: {
        beneficiaryFullName: String,
        beneficiaryAddress: String,
        bankName: String,
        accountNumber: String,
        transferReason: String,
        amount: Number,
      },
      shamCash: {
        accountNumber: String,
        qrCode: String,
        beneficiaryName: String,
        beneficiaryAddress: String,
      },
      usdt: {
        transferNetwork: String,
        walletAddress: String,
        walletQr: String,
      },
    },
    role: { type: String, default: "investor" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("investors", investorSchema);
