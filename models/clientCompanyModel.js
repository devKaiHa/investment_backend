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
        ownershipPercentage: {
          type: Number,
          required: true,
          min: 0,
          max: 100,
        },
      },
    ],

    // Board & Management
    boardMembers: {
      type: [
        {
          name: { type: String, required: true },
          position: { type: String, required: true },
        },
      ],
      validate: {
        validator: (v) => v.length >= 3,
        message: "At least 3 board members are required",
      },
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

    // Legal Disclosures
    legalDisclosures: {
      havePendingLegalDisputes: { type: Boolean, default: false },
      havePriorFinViolation: { type: Boolean, default: false },
      description: String,
      files: [String],
    },

    // Declarations
    legalRepName: String,
    title: String,
    idNumber: String,

    // Attachments
    commercialRegistration: String, // single
    legalRepAuthority: String, // single

    associationAndBylaws: [String], // multiple
    financialStatements: [String], // multiple

    partnersIdDocuments: [
      {
        title: String,
        fileUrl: String,
      },
    ],

    // Status
    active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ClientCompany", clientCompanyModel);
