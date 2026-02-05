const mongoose = require("mongoose");
const { paymentMethodSchema } = require("./paymentMethodsModel");

const companyIfnoSchema = new mongoose.Schema(
  {
    companyName: { type: String, minlength: 3 },
    companyAddress: String,
    companyTax: String,
    companyEmail: String,
    companyTel: String,
    companyLogo: { type: String, default: "defaultLogo.png" },

    paymentMethods: [paymentMethodSchema],
  },
  { timestamps: true },
);

module.exports = mongoose.model("companyinfo", companyIfnoSchema);
