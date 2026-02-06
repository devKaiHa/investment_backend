const mongoose = require("mongoose");

const emoloyeeShcema = new mongoose.Schema(
  {
    name: String,
    email: {
      type: String,
      lowercase: true,
    },
    active: {
      type: Boolean,
      default: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: 4,
      select: false,
    },
    passwordChangedAt: String,
    passwordResetCode: String,
    passwordResetExpires: String,
    passwordResetVerified: Boolean,
    image: String,
    role: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Roles",
    },
    companyId: String,
  },
  { timestamps: true },
);

module.exports = mongoose.model("Employee", emoloyeeShcema);
