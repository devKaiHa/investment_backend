const mongoose = require("mongoose");

const authUserSchema = new mongoose.Schema(
  {
    phone: { type: String, unique: true },
    password: String,
    active: { type: Boolean, default: true },
    activeSessionId: { type: String, default: null },
    sessionStartedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("authUser", authUserSchema);
