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
const clientRequest = require("../models/clientRequestModel");
const investorModel = require("../models/investorModel");

// Multer
const storage = multer.memoryStorage();
const upload = multer({ storage });
exports.uploadClientCompanyFiles = upload.any();

// File Processing
exports.processClientCompanyFiles = asyncHandler(async (req, res, next) => {
  if (!req.files?.length) return next();

  const uploadDir = "uploads/ClientCompany";
  await fs.promises.mkdir(uploadDir, { recursive: true });

  // req.body.partnersIdDocuments = req.body.partnersIdDocuments || [];

  await Promise.all(
    req.files.map(async (file) => {
      const isImage = file.mimetype.startsWith("image/");
      const isPdf = file.mimetype === "application/pdf";

      if (!isImage && !isPdf) {
        throw new Error("Unsupported file type");
      }

      const ext = isImage ? ".webp" : ".pdf";
      const filename = `ClientCompany-${uuidv4()}${ext}`;
      const uploadPath = path.join(uploadDir, filename);

      if (isImage) {
        await sharp(file.buffer).webp({ quality: 75 }).toFile(uploadPath);
      } else {
        await fs.promises.writeFile(uploadPath, file.buffer);
      }

      // Field Mapping
      switch (file.fieldname) {
        case "commercialRegistration":
          req.body.commercialRegistration = filename;
          break;

        case "associationMemorandumIncorp":
          req.body.associationMemorandumIncorp = [
            ...(req.body.associationMemorandumIncorp || []),
            filename,
          ];
          break;

        case "associationAndBylaws":
          req.body.associationAndBylaws = [
            ...(req.body.associationAndBylaws || []),
            filename,
          ];
          break;

        case "financialStatements":
          req.body.financialStatements = [
            ...(req.body.financialStatements || []),
            filename,
          ];
          break;

        case "legalRepAuthority":
          req.body.legalRepAuthority = filename;
          break;

        default:
          console.log("asd");
        // if (file.fieldname.startsWith("partnersId_")) {
        //   req.body.partnersIdDocuments.push({
        //     title: req.body[`${file.fieldname}_key`] || "",
        //     fileUrl: filename,
        //   });
        // }
      }
    }),
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
    req.body.havePendingLegalDisputes,
  );
  req.body.havePriorFinViolation = normalizeBoolean(
    req.body.havePriorFinViolation,
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
    [],
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

  const legalDisclosures = {
    havePendingLegalDisputes:
      normalize(req.body.havePendingLegalDisputes) === "true",
    havePriorFinViolation: normalize(req.body.havePriorFinViolation) === "true",
    description: req.body.legalDisclosuresDesc || "",
  };

  // BUILD UPDATE PAYLOAD
  const updatePayload = {
    // primitive fields
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

    // parsed objects
    owners,
    boardMembers,
    reqInvestAmount,
    targetMarketCountries,
    legalDisclosures,

    // enums / booleans
    targetMarkets: req.body.targetMarkets?.toUpperCase(),
    haveInternalBylaws: normalize(req.body.haveInternalBylaws) === "true",
  };

  // UPDATE
  const company = await clientRequest.findByIdAndUpdate(
    id,
    { $set: updatePayload },
    { new: true, runValidators: true },
  );

  if (!company) {
    return res.status(404).json({
      status: false,
      message: "Client company not found",
    });
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
      deletable: false,
      ownedShares: [
        {
          isFounder: true,
          percentage: owner.ownershipPercentage || 0,
          company: company._id,
        },
      ],
    }));

    await investorModel.insertMany(founders);
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
    availableShares,
    minInvestAmount,
    subscriptionStart,
    subscriptionEnd,
    owners,
  } = req.body;

  if (!id) {
    return res.status(400).json({
      status: false,
      message: "No ID provided",
    });
  }

  const company = await ClientCompanyModel.findById(id);

  if (!company) {
    return res.status(404).json({
      status: false,
      message: "Company not found",
    });
  }

  if (!company.active) {
    return res.status(400).json({
      status: false,
      message: "Company isn't active",
    });
  }

  // VALIDATIONS
  if (initialShares !== undefined && Number(initialShares) <= 0) {
    return res.status(400).json({
      status: false,
      message: "Initial shares must be greater than zero",
    });
  }

  if (sharePrice !== undefined && Number(sharePrice) <= 0) {
    return res.status(400).json({
      status: false,
      message: "Share price must be greater than zero",
    });
  }

  if (
    subscriptionStart &&
    subscriptionEnd &&
    new Date(subscriptionEnd) <= new Date(subscriptionStart)
  ) {
    return res.status(400).json({
      status: false,
      message: "Subscription end date must be after start date",
    });
  }

  if (Array.isArray(owners)) {
    for (const o of owners) {
      if (!o.isSelling) continue;

      const ownership = Number(o.ownershipPercentage);
      const selling = Number(o.sellingAmount);

      if (isNaN(ownership) || isNaN(selling)) {
        return res.status(400).json({
          status: false,
          message: "Invalid ownership or selling percentage",
        });
      }

      if (selling <= 0 || selling > 100) {
        return res.status(400).json({
          status: false,
          message: "Selling percentage must be between 1 and 100",
        });
      }

      const remainingPercentage = ownership * (1 - selling / 100);

      if (remainingPercentage < 10) {
        return res.status(400).json({
          status: false,
          message: `${o.fullName} must retain at least 10% of the company`,
        });
      }
    }
  }

  if (Array.isArray(owners)) {
    company.owners = owners.map((o) => {
      const prevOwner = company.owners.find(
        (po) => po.nationalId === o.nationalId,
      );

      const wasSelling = Boolean(prevOwner?.isSelling);
      const isSellingNow = Boolean(o.isSelling);

      return {
        fullName: o.fullName,
        nationality: o.nationality,
        nationalId: o.nationalId,
        ownershipPercentage: o.ownershipPercentage,
        isSelling: isSellingNow,
        sellingAmount: o.sellingAmount,

        // Set when isSelling = false changed to true
        startedSellingOn:
          !wasSelling && isSellingNow
            ? new Date().toISOString()
            : (prevOwner?.startedSellingOn ?? null),
      };
    });
  }

  if (initialShares !== undefined) company.initialShares = initialShares;
  if (sharePrice !== undefined) company.sharePrice = sharePrice;
  if (availableShares !== undefined) company.availableShares = availableShares;
  if (minInvestAmount !== undefined) company.minInvestAmount = minInvestAmount;
  if (subscriptionStart) company.subscriptionStart = subscriptionStart;
  if (subscriptionEnd) company.subscriptionEnd = subscriptionEnd;

  await company.save();

  res.status(200).json({
    status: true,
    message: "Company investment info updated successfully",
    data: company,
  });
});
