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
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    passportId: {
      type: String,
      index: true,
      trim: true,
    },
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
  },
  { timestamps: true },
);

module.exports = mongoose.model("investors", investorSchema);
