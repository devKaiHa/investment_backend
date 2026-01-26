const mongoose = require("mongoose");

const companyIfnoSchema = new mongoose.Schema(
  {
    companyName: {
      type: String,
      minlength: [3, "Name is too short"],
    },
    companyAddress: String,
    companyTax: String,
    companyEmail: String,
    companyTel: String,
    companyLogo: {
      type: String,
      default: `defaultLogo.png`,
    },
    bankQR: [
      {
        name: { type: String, default: "" },
        accountNumber: { type: String, default: "" },
        qrCode: { type: String, default: "" },
      },
    ],
  },
  { timestamps: true },
);

module.exports = mongoose.model("companyinfo", companyIfnoSchema);
