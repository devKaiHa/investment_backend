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
    birthDate: String,

    reviewStatus: {
      type: String,
      enum: ["draft", "pending", "approved", "rejected"],
      default: "draft",
    },
    rejectionReason: String,
    attachments: [
      {
        key: String,
        fileUrl: String,
      },
    ],

    profileImage: String,
    deletable: { type: Boolean, default: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model("applicant", applicantSchema);
