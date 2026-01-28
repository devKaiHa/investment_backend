const mongoose = require("mongoose");

const ACTOR_TYPES = ["investors", "ClientCompany", "InvestmentFund"];
const INSTRUMENT_TYPES = ["ClientCompany", "InvestmentFund"];
const TX_TYPES = ["ISSUE", "INVEST", "TRANSFER", "REDEEM"];

const shareTransactionLogSchema = new mongoose.Schema(
  {
    type: { type: String, enum: TX_TYPES, required: true },

    // ✅ WHAT this transaction is about (company share OR fund unit)
    instrument: {
      entityType: { type: String, enum: INSTRUMENT_TYPES, required: true },
      entityId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        refPath: "instrument.entityType",
        index: true,
      },
    },

    // ✅ WHO sent
    from: {
      entityType: { type: String, enum: ACTOR_TYPES, required: true },
      entityId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        refPath: "from.entityType",
        index: true,
      },
    },

    // ✅ WHO received
    to: {
      entityType: { type: String, enum: ACTOR_TYPES, required: true },
      entityId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        refPath: "to.entityType",
        index: true,
      },
    },

    shares: { type: Number, required: true, min: 1 },
    sharePrice: { type: Number, required: true, min: 0.000001 },
    totalAmount: { type: Number, required: true, min: 0 },

    description: {
      en: { type: String, default: "" },
      ar: { type: String, default: "" },
    },
  },
  { timestamps: true }
);

// common queries (instrument ledger + investor activity)
shareTransactionLogSchema.index({
  "instrument.entityType": 1,
  "instrument.entityId": 1,
  createdAt: -1,
});
shareTransactionLogSchema.index({
  "from.entityType": 1,
  "from.entityId": 1,
  createdAt: -1,
});
shareTransactionLogSchema.index({
  "to.entityType": 1,
  "to.entityId": 1,
  createdAt: -1,
});

module.exports = mongoose.model("ShareTransaction", shareTransactionLogSchema);
