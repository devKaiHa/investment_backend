const { default: mongoose } = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "investors",
      required: true,
    },

    type: {
      type: String,
      enum: ["success", "destructive", "warning"],
      required: true,
    },

    title: String,
    message: String,

    meta: {
      tradeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ShareTradeRequest",
      },
      reason: String,
      previousStatus: String,
      newStatus: String,
    },

    isRead: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

notificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model("notification", notificationSchema);
