const mongoose = require("mongoose");

exports.paymentMethodSchema = new mongoose.Schema(
  {
    method: {
      type: String,
      enum: ["bank", "shamCash", "usdt"],
      required: true,
    },

    bank: {
      beneficiaryFullName: String,
      beneficiaryAddress: String,
      bankName: String,
      accountNumber: String,
      amount: Number,
      qrCode: String,
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
  { _id: true },
);
