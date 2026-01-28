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
    return res.status(400).json({
      status: false,
      message: "At least 3 board members are required",
    });
  }

  if (req.body.haveInternalBylaws && !req.body.associationAndBylaws?.length) {
    return res.status(400).json({
      status: false,
      message: "Association & bylaws document is required",
    });
  }

  if (
    req.body.targetMarkets === "INTERNATIONAL" &&
    !req.body.targetMarketCountries?.length
  ) {
    return res.status(400).json({
      status: false,
      message: "Target market countries are required",
    });
  }

  // Create
  const company = await clientRequest.create(req.body);

  res.status(201).json({
    status: true,
    message: "Client company created successfully",
    data: company,
  });
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
  const { id } = req.params;
  const { status, msg } = req.body; // "approved" | "rejected"

  // Validate the status
  if (!["approved", "rejected"].includes(status)) {
    return res.status(400).json({
      status: false,
      message: "Invalid status value",
    });
  }

  // Get the request
  const request = await clientRequest.findById(id);

  if (!request) {
    return res.status(404).json({
      status: false,
      message: "Client request not found",
    });
  }

  const exists = await ClientCompanyModel.findOne({ crn: request.crn });

  if (exists) {
    return res.status(400).json({
      status: false,
      message: "Company already exists",
    });
  }

  // Prevent double action
  if (request.status !== "pending") {
    return res.status(400).json({
      status: false,
      message: `Request already ${request.status}`,
    });
  }

  // When rejecting
  if (status === "rejected") {
    request.status = "rejected";
    request.active = false;
    request.rejectionMessage = msg || "";

    await request.save();

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

  // Create company section
  const companyData = request.toObject();

  // Remove request fields
  delete companyData._id;
  delete companyData.status;
  delete companyData.rejectionMessage;
  delete companyData.createdAt;
  delete companyData.updatedAt;
  delete companyData.__v;

  // Create the company
  const company = await ClientCompanyModel.create({
    ...companyData,
    active: true,
    approvedBy: req.user?._id,
  });

  if (Array.isArray(company.owners) && company.owners.length > 0) {
    const founders = company.owners.map((owner) => ({
      fullName: owner.fullName,
      nationalId: owner.nationalId,
    }));

    await Investor.insertMany(founders);
  }

  await sendEmail({
    email: company.email,
    subject: "Investment Account Approved!",
    message: `Hello ${company.fullLegalName}, your company's application was approved`,
  });

  // Delete request after approval
  await clientRequest.findByIdAndDelete(request._id);

  res.status(200).json({
    status: true,
    message: "Client company approved and created successfully",
    data: {
      requestId: request._id,
      companyId: company._id,
    },
  });
});

exports.updateInvestInfo = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    sharePrice,
    initialShares,
    minInvestShare,
    maxInvestShare,
    owners: incomingOwners = [],
  } = req.body;

  const company = await ClientCompanyModel.findById(id);
  if (!company) {
    return res
      .status(404)
      .json({ status: false, message: "Company not found" });
  }

  // 1) Set company values first
  if (sharePrice !== undefined) company.sharePrice = sharePrice;
  if (initialShares !== undefined) company.initialShares = initialShares;
  if (minInvestShare !== undefined) company.minInvestShare = minInvestShare;
  if (maxInvestShare !== undefined) company.maxInvestShare = maxInvestShare;

  // 2) Apply owners initialShares from request (match by nationalId)
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

  // 3) Validate: Sum owners shares must equal company.initialShares
  const ownersSum = (company.owners || []).reduce(
    (sum, o) => sum + Number(o.initialShares || 0),
    0
  );

  const companyInitialShares = Number(company.initialShares || 0);

  if (ownersSum !== companyInitialShares) {
    return res.status(400).json({
      status: false,
      message: `Sum of owners shares must equal initial shares. ownersSum=${ownersSum}, initialShares=${companyInitialShares}`,
    });
  }

  // 4) Ensure investors + holdings
  if (Array.isArray(company.owners) && company.owners.length > 0) {
    const companyOwners = company.owners.filter((o) => o?.nationalId);

    const nationalIds = companyOwners.map((o) => String(o.nationalId).trim());

    // find existing investors
    const existing = await Investor.find({ nationalId: { $in: nationalIds } })
      .select("_id nationalId")
      .lean();

    const investorIdByNationalId = new Map(
      existing.map((inv) => [String(inv.nationalId).trim(), inv._id])
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
        { ordered: false }
      );

      // re-fetch ids
      const after = await Investor.find({ nationalId: { $in: nationalIds } })
        .select("_id nationalId")
        .lean();

      after.forEach((inv) =>
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
          { upsert: true }
        );
      })
    );
  }

  // 5) Save company
  await company.save();

  return res.status(200).json({
    status: true,
    message: "Investment info updated",
    data: company,
  });
});
