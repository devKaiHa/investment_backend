const mongoose = require("mongoose");

const authUserSchema = new mongoose.Schema(
  {
    phone: { type: String, unique: true },
    countryCode: { type: String, uppercase: true },
    password: String,
    active: { type: Boolean, default: true },
    pinCode: { type: String, default: null, select: false },
    isInvestor: { type: Boolean, default: false },
    pinVerifiedAt: { type: String, default: null },
    loginChallengeId: { type: String, default: null },
    challengeCreatedAt: { type: String, default: null },
    activeSessionId: { type: String, default: null },
    sessionStartedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("authUser", authUserSchema);
