const multer = require("multer");
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const asyncHandler = require("express-async-handler");
const ClientCompanyModel = require("../models/clientCompanyModel");
const {
  normalizeBoolean,
  safeJsonParse,
  sendEmail,
} = require("../utils/helpers");
const clientRequest = require("../models/onbording/clientRequestModel");
const Investor = require("../models/investorModel");
const InvestorHolding = require("../models/investorHoldingSchema");
const { default: mongoose } = require("mongoose");
const shareTransactionLog = require("../models/shareTransactionLog");

// Multer
const storage = multer.memoryStorage();
const upload = multer({ storage });
exports.uploadClientCompanyFiles = upload.any();

const ensureArray = (val) => {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  if (typeof val === "string") {
    try {
      const parsed = JSON.parse(val);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

const ensureObject = (val) => {
  if (!val) return {};
  if (typeof val === "object") return val;
  try {
    return JSON.parse(val);
  } catch {
    return {};
  }
};

exports.processClientCompanyFiles = asyncHandler(async (req, res, next) => {
  if (!req.files?.length) return next();

  const uploadDir = "uploads/ClientCompany";
  await fs.promises.mkdir(uploadDir, { recursive: true });

  await Promise.all(
    req.files.map(async (file) => {
      const isImage = file.mimetype.startsWith("image/");
      const isPdf = file.mimetype === "application/pdf";
      if (!isImage && !isPdf) throw new Error("Unsupported file type");

      const ext = isImage ? ".webp" : ".pdf";
      const filename = `ClientCompany-${uuidv4()}${ext}`;
      const uploadPath = path.join(uploadDir, filename);

      if (isImage)
        await sharp(file.buffer).webp({ quality: 75 }).toFile(uploadPath);
      else await fs.promises.writeFile(uploadPath, file.buffer);

      switch (file.fieldname) {
        case "commercialRegistration":
          req.body.commercialRegistration = filename;
          break;

        case "legalRepAuthority":
          req.body.legalRepAuthority = filename;
          break;

        case "associationMemorandumIncorp": {
          const arr = ensureArray(req.body.associationMemorandumIncorp);
          req.body.associationMemorandumIncorp = [...arr, filename];
          break;
        }

        case "associationAndBylaws": {
          const arr = ensureArray(req.body.associationAndBylaws);
          req.body.associationAndBylaws = [...arr, filename];
          break;
        }

        case "financialStatements": {
          const arr = ensureArray(req.body.financialStatements);
          req.body.financialStatements = [...arr, filename];
          break;
        }

        case "legalDisclosuresFiles": {
          const legal = ensureObject(req.body.legalDisclosures);
          legal.files = [...(legal.files || []), filename];
          req.body.legalDisclosures = legal; // keep as object/string OK
          break;
        }

        default:
          break;
      }
    })
  );

  next();
});
// Create Company
exports.createClientCompany = asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Normalize strings / enums
    if (req.body.targetMarkets) {
      req.body.targetMarkets = req.body.targetMarkets.toUpperCase();
    }

    if (req.body.legalStructure) {
      req.body.legalStructure = req.body.legalStructure.toUpperCase();
    }

    if (req.body.investmentType) {
      req.body.investmentType = req.body.investmentType.toUpperCase();
    }

    // Normalize booleans
    req.body.active = normalizeBoolean(req.body.active);
    req.body.haveInternalBylaws = normalizeBoolean(req.body.haveInternalBylaws);
    req.body.havePendingLegalDisputes = normalizeBoolean(
      req.body.havePendingLegalDisputes
    );
    req.body.havePriorFinViolation = normalizeBoolean(
      req.body.havePriorFinViolation
    );

    // Parse JSON fields
    req.body.owners = safeJsonParse(req.body.owners, []);
    req.body.boardMembers = safeJsonParse(req.body.boardMembers, []);
    req.body.legalDisclosures = safeJsonParse(req.body.legalDisclosures, {});
    req.body.reqInvestAmount = safeJsonParse(req.body.reqInvestAmount, {
      currency: "",
      amount: 0,
    });

    // Ensure number
    req.body.reqInvestAmount.amount =
      Number(req.body.reqInvestAmount.amount) || 0;

    req.body.targetMarketCountries = safeJsonParse(
      req.body.targetMarketCountries,
      []
    );

    // Validations
    if (!req.body.boardMembers || req.body.boardMembers.length < 3) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        status: false,
        message: "At least 3 board members are required",
      });
    }

    if (req.body.haveInternalBylaws && !req.body.associationAndBylaws?.length) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        status: false,
        message: "Association & bylaws document is required",
      });
    }

    if (
      req.body.targetMarkets === "INTERNATIONAL" &&
      !req.body.targetMarketCountries?.length
    ) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        status: false,
        message: "Target market countries are required",
      });
    }

    // Create (IMPORTANT: pass session)
    const company = await clientRequest.create([req.body], { session });
    // create([doc]) returns array
    const createdCompany = company[0];

    await session.commitTransaction();
    session.endSession();

    return res.status(201).json({
      status: true,
      message: "Client company created successfully",
      data: createdCompany,
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
});

// Get All
exports.getAllClientCompanies = asyncHandler(async (req, res) => {
  const {
    keyword,
    page = 1,
    limit = 10,
    sort = "-createdAt",
    active = "true",
  } = req.query;

  const query = { active: active === "true" };

  if (keyword?.trim()) {
    query.$or = [
      { fullLegalName: new RegExp(keyword, "i") },
      { tradeName: new RegExp(keyword, "i") },
      { email: new RegExp(keyword, "i") },
      { phoneNumber: new RegExp(keyword, "i") },
    ];
  }

  const skip = (page - 1) * limit;

  const [companies, total] = await Promise.all([
    ClientCompanyModel.find(query).sort(sort).skip(skip).limit(Number(limit)),
    ClientCompanyModel.countDocuments(query),
  ]);

  res.status(200).json({
    status: true,
    message: "success",
    pagination: {
      totalItems: total,
      totalPages: Math.ceil(total / limit),
      page: Number(page),
      limit: Number(limit),
    },
    data: companies,
  });
});

// Get All
exports.getAllClientRequests = asyncHandler(async (req, res) => {
  const { keyword, page = 1, limit = 10, sort = "-createdAt" } = req.query;

  const query = { active: "false" };

  if (keyword?.trim()) {
    query.$or = [
      { fullLegalName: new RegExp(keyword, "i") },
      { tradeName: new RegExp(keyword, "i") },
      { email: new RegExp(keyword, "i") },
      { phoneNumber: new RegExp(keyword, "i") },
    ];
  }

  const skip = (page - 1) * limit;

  const [companies, total] = await Promise.all([
    clientRequest.find(query).sort(sort).skip(skip).limit(Number(limit)),
    clientRequest.countDocuments(query),
  ]);

  res.status(200).json({
    status: true,
    message: "success",
    pagination: {
      totalItems: total,
      totalPages: Math.ceil(total / limit),
      page: Number(page),
      limit: Number(limit),
    },
    data: companies,
  });
});

// Get One
exports.getOneCompany = asyncHandler(async (req, res) => {
  const company = await ClientCompanyModel.findById(req.params.id);

  if (!company) {
    return res.status(404).json({
      status: false,
      message: "Client company not found",
    });
  }

  res.status(200).json({
    status: true,
    message: "success",
    data: company,
  });
});

exports.getOneClientCompany = asyncHandler(async (req, res) => {
  const company = await clientRequest.findById(req.params.id);

  if (!company) {
    return res.status(404).json({
      status: false,
      message: "Client company not found",
    });
  }

  res.status(200).json({
    status: true,
    message: "success",
    data: company,
  });
});

// Update
exports.updateClientCompany = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // PARSE COMPLEX FIELDS
  const owners = parseJSON(req.body.owners, []);
  const boardMembers = parseJSON(req.body.boardMembers, []);
  const reqInvestAmount = parseJSON(req.body.reqInvestAmount, {
    currency: "",
    amount: "",
  });
  const targetMarketCountries = parseJSON(req.body.targetMarketCountries, []);

  // ✅ FIX: legalDisclosures comes as JSON string/object in req.body.legalDisclosures
  const legalDisclosures = parseJSON(req.body.legalDisclosures, {
    files: [],
    havePendingLegalDisputes: false,
    havePriorFinViolation: false,
    PendingLitigationDesc: "",
    FinancialJudgmentsDesc: "",
  });

  // ✅ Parse files arrays (they may be array already from process middleware)
  const financialStatements = parseJSON(
    req.body.financialStatements,
    undefined
  );
  const associationMemorandumIncorp = parseJSON(
    req.body.associationMemorandumIncorp,
    undefined
  );
  const associationAndBylaws = parseJSON(
    req.body.associationAndBylaws,
    undefined
  );

  // BUILD UPDATE PAYLOAD
  const updatePayload = {
    fullLegalName: req.body.fullLegalName,
    tradeName: req.body.tradeName,
    legalStructure: req.body.legalStructure,
    crn: req.body.crn,
    registeringAuthority: req.body.registeringAuthority,
    dateIncorporation: req.body.dateIncorporation,
    governorate: req.body.governorate,
    registeredLegalAddress: req.body.registeredLegalAddress,
    phoneNumber: req.body.phoneNumber,
    email: req.body.email,
    website: req.body.website,

    owners,
    boardMembers,
    reqInvestAmount,
    targetMarketCountries,
    legalDisclosures,

    targetMarkets: req.body.targetMarkets?.toUpperCase(),
    haveInternalBylaws: normalize(req.body.haveInternalBylaws) === "true",
  };

  // ✅ Single file fields (only set if provided)
  if (
    req.body.commercialRegistration &&
    req.body.commercialRegistration !== "null"
  ) {
    updatePayload.commercialRegistration = req.body.commercialRegistration;
  }
  if (req.body.legalRepAuthority && req.body.legalRepAuthority !== "null") {
    updatePayload.legalRepAuthority = req.body.legalRepAuthority;
  }

  // ✅ Array file fields (only set if provided)
  if (Array.isArray(req.body.financialStatements)) {
    updatePayload.financialStatements =
      req.body.financialStatements.filter(Boolean);
  }
  if (Array.isArray(req.body.associationMemorandumIncorp)) {
    updatePayload.associationMemorandumIncorp =
      req.body.associationMemorandumIncorp.filter(Boolean);
  }
  if (Array.isArray(req.body.associationAndBylaws)) {
    updatePayload.associationAndBylaws =
      req.body.associationAndBylaws.filter(Boolean);
  }

  const company = await clientRequest.findByIdAndUpdate(
    id,
    { $set: updatePayload },
    { new: true, runValidators: true }
  );

  if (!company) {
    return res
      .status(404)
      .json({ status: false, message: "Client company not found" });
  }

  res.status(200).json({
    status: true,
    message: "Client company updated successfully",
    data: company,
  });
});

const parseJSON = (value, fallback) => {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const normalize = (v) => (typeof v === "string" ? v.trim() : v);

// Activate / Deactivate
exports.clientCompanyStatus = asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const { status, msg } = req.body;

    if (!["approved", "rejected"].includes(status)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        status: false,
        message: "Invalid status value",
      });
    }

    const request = await clientRequest.findById(id).session(session);

    if (!request) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        status: false,
        message: "Client request not found",
      });
    }

    if (request.status !== "pending") {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        status: false,
        message: `Request already ${request.status}`,
      });
    }

    const exists = await ClientCompanyModel.findOne({
      crn: request.crn,
    }).session(session);

    if (exists) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        status: false,
        message: "Company already exists",
      });
    }

    /* ------------------------------------------------
       REJECT FLOW
    ------------------------------------------------ */
    if (status === "rejected") {
      request.status = "rejected";
      request.active = false;
      request.rejectionMessage = msg || "";

      await request.save({ session });

      await session.commitTransaction();
      session.endSession();

      await sendEmail({
        email: request.email,
        subject: "Investment Account Rejected!",
        message: request.rejectionMessage,
      });

      return res.status(200).json({
        status: true,
        message: "Client request rejected",
      });
    }

    /* ------------------------------------------------
       APPROVE FLOW
    ------------------------------------------------ */

    const companyData = request.toObject();

    delete companyData._id;
    delete companyData.status;
    delete companyData.rejectionMessage;
    delete companyData.createdAt;
    delete companyData.updatedAt;
    delete companyData.__v;

    const company = await ClientCompanyModel.create(
      [
        {
          ...companyData,
          active: true,
          approvedBy: req.user?._id,
        },
      ],
      { session }
    );

    const createdCompany = company[0];

    // Create investors for owners (FOUNDERS)
    if (Array.isArray(createdCompany.owners) && createdCompany.owners.length) {
      const founders = createdCompany.owners.map((o) => ({
        fullName: o.fullName,
        nationalId: String(o.nationalId).trim(),
      }));

      await Investor.insertMany(founders, {
        ordered: false,
        session,
      });
    }

    // Delete request AFTER success
    await clientRequest.findByIdAndDelete(request._id).session(session);

    await session.commitTransaction();
    session.endSession();

    await sendEmail({
      email: createdCompany.email,
      subject: "Investment Account Approved!",
      message: `Hello ${createdCompany.fullLegalName}, your company's application was approved`,
    });

    return res.status(200).json({
      status: true,
      message: "Client company approved and created successfully",
      data: {
        requestId: request._id,
        companyId: createdCompany._id,
      },
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
});

exports.updateInvestInfo = asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const {
      sharePrice,
      initialShares,
      minInvestShare,
      maxInvestShare,
      owners: incomingOwners = [],
    } = req.body;

    const company = await ClientCompanyModel.findById(id).session(session);
    if (!company) {
      throw new Error("Company not found");
    }

    // 1) Update company values (allowed anytime)
    if (sharePrice !== undefined) company.sharePrice = Number(sharePrice) || 0;
    if (minInvestShare !== undefined)
      company.minInvestShare = Number(minInvestShare) || 0;
    if (maxInvestShare !== undefined)
      company.maxInvestShare = Number(maxInvestShare) || 0;

    // initialShares should only be set once (optional rule, but recommended)
    if (initialShares !== undefined && !company.initialShares) {
      company.initialShares = Number(initialShares) || 0;
    }

    // 2) Apply owners initialShares only if sent (match by nationalId)
    if (Array.isArray(incomingOwners) && incomingOwners.length > 0) {
      company.owners = (company.owners || []).map((o) => {
        const match = incomingOwners.find(
          (x) => String(x.nationalId).trim() === String(o.nationalId).trim()
        );

        if (match && match.initialShares !== undefined) {
          o.initialShares = Number(match.initialShares) || 0;
        }
        return o;
      });
    }

    // 3) Validate owners sum ONLY when owners shares are being set
    if (Array.isArray(incomingOwners) && incomingOwners.length > 0) {
      const ownersSum = (company.owners || []).reduce(
        (sum, o) => sum + Number(o.initialShares || 0),
        0
      );

      const companyInitialShares = Number(company.initialShares || 0);

      if (ownersSum !== companyInitialShares) {
        return res.status(400).json({
          status: false,
          message: "Sum of owners shares must equal initial shares",
        });
      }
    }

    // 4) ISSUE logic only once
    if (
      !company.shareIssued &&
      Array.isArray(incomingOwners) &&
      incomingOwners.length > 0
    ) {
      const companyOwners = (company.owners || []).filter((o) => o?.nationalId);
      const nationalIds = companyOwners.map((o) => String(o.nationalId).trim());

      // find existing investors by nationalId
      const existing = await Investor.find({ nationalId: { $in: nationalIds } })
        .select("_id nationalId")
        .lean()
        .session(session);

      const investorIdByNationalId = new Map(
        existing.map((i) => [String(i.nationalId).trim(), i._id])
      );

      // insert missing investors
      const missing = companyOwners.filter(
        (o) => !investorIdByNationalId.has(String(o.nationalId).trim())
      );

      if (missing.length > 0) {
        await Investor.insertMany(
          missing.map((o) => ({
            fullName: o.fullName,
            nationalId: String(o.nationalId).trim(),
          })),
          { ordered: false, session }
        );

        const afterInsert = await Investor.find({
          nationalId: { $in: nationalIds },
        })
          .select("_id nationalId")
          .lean()
          .session(session);

        afterInsert.forEach((inv) =>
          investorIdByNationalId.set(String(inv.nationalId).trim(), inv._id)
        );
      }

      // upsert holdings
      await Promise.all(
        companyOwners.map((o) => {
          const invId = investorIdByNationalId.get(String(o.nationalId).trim());
          const shares = Number(o.initialShares || 0);

          return InvestorHolding.updateOne(
            { investor: invId, company: company._id },
            { $set: { shares } },
            { upsert: true, session }
          );
        })
      );

      // create ISSUE logs
      const logs = companyOwners
        .map((o) => {
          const invId = investorIdByNationalId.get(String(o.nationalId).trim());
          const shares = Number(o.initialShares || 0);
          const p = Number(company.sharePrice || 0);

          if (!invId || shares <= 0) return null;

          return {
            type: "ISSUE",
            instrument: { entityType: "ClientCompany", entityId: company._id },
            from: { entityType: "ClientCompany", entityId: company._id },
            to: { entityType: "investors", entityId: invId },
            shares,
            sharePrice: p,
            totalAmount: shares * p,
            description: {
              en: `Initial share issuance. Founder ${o.fullName} (${o.nationalId}) received ${shares} shares.`,
              ar: `إصدار أولي للأسهم. تم تخصيص ${shares} سهمًا للمؤسس ${o.fullName} (${o.nationalId}).`,
            },
          };
        })
        .filter(Boolean);

      if (logs.length > 0) {
        await shareTransactionLog.insertMany(logs, { session });
      }

      company.shareIssued = true;
    }

    // 5) save + commit
    await company.save({ session });
    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({
      status: true,
      message: "Investment info updated",
      data: company,
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();

    // keep your error format
    return res.status(500).json({
      status: false,
      message: err?.message || "Server error",
    });
  }
});
