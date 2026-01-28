const mongoose = require("mongoose");

const clientCompanyModel = new mongoose.Schema(
  {
    // Company Information
    fullLegalName: { type: String, required: true },
    tradeName: String,
    legalStructure: {
      type: String,
      required: true,
      enum: ["ANONYMOUS", "LIMITED", "JOINTSTOCK", "PARTNERSHIP"],
    },
    crn: String, // Commercial Registration Number
    registeringAuthority: {
      type: String,
      enum: ["CHAMBERCOMMERCE", "CHAMBERINDUSTRY"],
    },
    dateIncorporation: String,
    governorate: String,
    registeredLegalAddress: String,
    phoneNumber: String,
    email: String,
    website: String,

    // Ownership & Beneficial Owners
    owners: [
      {
        fullName: { type: String, required: true },
        nationality: { type: String, required: true },
        nationalId: { type: String, required: true },
        initialShares: { type: String },
        ownershipPercentage: {
          type: Number,
          required: true,
          min: 0,
          max: 100,
        },
        _id: false,
      },
    ],

    // Board & Management
    boardMembers: {
      type: [
        {
          name: { type: String, required: true },
          position: { type: String, required: true },
          _id: false,
        },
      ],
    },
    haveInternalBylaws: { type: Boolean, default: false },

    // Company Activities
    primaryBusinessObjective: String,
    economicSector: String,
    targetMarkets: {
      type: String,
      enum: ["DOMESTIC", "INTERNATIONAL"],
      required: true,
    },
    targetMarketCountries: {
      type: [String],
      default: [],
    },

    // Investment Details
    reqInvestAmount: {
      currency: String,
      amount: Number,
    },
    investmentType: {
      type: String,
      enum: ["EQUITY", "DEBT", "PARTNERSHIP"],
    },
    proposedEquityShare: String,
    useOfProceeds: String,
    investmentHorizon: String,
    exitStrategy: String,
    // Pricing
    sharePrice: { type: Number, default: 0 },
    initialShares: { type: Number, default: 0 },
    minInvestShare: { type: Number, default: 1 },
    maxInvestShare: { type: Number, default: 1 },

    // Legal Disclosures
    legalDisclosures: {
      havePendingLegalDisputes: { type: Boolean, default: false },
      havePriorFinViolation: { type: Boolean, default: false },
      PendingLitigationDesc: String,
      FinancialJudgmentsDesc: String,
      files: [String],
    },

    // Declarations
    legalRepName: String,
    title: String,
    idNumber: String,

    // Attachments
    commercialRegistration: String, // single
    legalRepAuthority: String, // single
    associationMemorandumIncorp: [String], // multiple
    associationAndBylaws: [String], // multiple
    financialStatements: [String], // multiple
    bankQR: [
      {
        name: { type: String, default: "" },
        accountNumber: { type: String, default: "" },
        qrCode: { type: String, default: "" },
      },
    ],

    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
    },
    // Status
    shareIssued: {
      type: Boolean,
      default: false,
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ClientCompany", clientCompanyModel);
