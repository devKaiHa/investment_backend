const asyncHandler = require("express-async-handler");
const Investor = require("../../models/investorModel");
const shareHolder = require("../../models/shares/sharesHolderModel");
const { v4: uuidv4 } = require("uuid");
const sharp = require("sharp");
const bcrypt = require("bcryptjs");
const multer = require("multer");
const fs = require("fs");
const { generatePassword, sendEmail } = require("../../utils/helpers");
const { default: mongoose } = require("mongoose");
const applicantModel = require("../../models/onbording/applicantModel");
const authUserModel = require("../../models/auth/authUserModel");
const ShareTransaction = require("../../models/shares/shareTransactionModel");
const InvestmentFund = require("../../models/InvestmentsEntity/investmentFundModel");
const { createNotification } = require("../utils/notificationService");
const ApiError = require("../../utils/apiError");

//for creating
const storage = multer.memoryStorage();
const upload = multer({ storage });
exports.uploadInvestorImages = upload.any();

// Image processing
exports.resizeInvestorImages = asyncHandler(async (req, res, next) => {
  if (!req.files || req.files.length === 0) return next();

  req.body.attachments = [];

  await Promise.all(
    req.files.map(async (file, i) => {
      const isImage = file.mimetype.startsWith("image/");
      const filename = `Investor-${uuidv4()}-${Date.now()}-${file.fieldname}${
        isImage ? ".webp" : ".pdf"
      }`;
      const outputPath = `uploads/Investor/${filename}`;

      if (isImage) {
        await sharp(file.buffer)
          .toFormat("webp")
          .webp({ quality: 70 })
          .toFile(outputPath);
      } else if (file.mimetype === "application/pdf") {
        await fs.promises.writeFile(outputPath, file.buffer);
      } else {
        throw new Error("Unsupported file type");
      }

      // handle attachments
      const key = req.body[`attachment_${i}_key`] || file.fieldname;

      if (file.fieldname === "profileImage" && isImage) {
        req.body.profileImage = filename;
      } else {
        req.body.attachments.push({
          key,
          fileUrl: filename,
        });
      }
    })
  );

  next();
});

// @desc Create Investor
// @route POST /api/Investor
// @access Private
exports.createInvestor = asyncHandler(async (req, res, next) => {
  try {
    const isFounder = req.body.isFounder === "true";
    req.body.isFounder = isFounder;
    req.body.deletable = !isFounder;

    if (req.body.ibanNumbers) {
      req.body.ibanNumbers = JSON.parse(req.body.ibanNumbers);
    }

    const investorPass = generatePassword();
    const hashedPassword = await bcrypt.hash(investorPass, 12);

    req.body.password = hashedPassword;
    //Sned password to email
    await sendEmail({
      email: req.body.email,
      subject: "New Password",
      message: `Hello ${req.body.fullName}, your password is ${investorPass}`,
    });

    const investor = await Investor.create(req.body);

    res.status(201).json({
      status: true,
      message: "success",
      data: investor,
    });
  } catch (error) {
    console.error(`Error creating investor: ${error.message}`);
    return res.status(500).json({
      status: false,
      message: error.message,
    });
  }
});

// @desc Get all investors
// @route GET /api/investor
// @access Private
exports.getAllInvestors = asyncHandler(async (req, res) => {
  const { keyword, page = 1, limit = 10, sort, company, minAmount } = req.query;

  try {
    const query = {};

    // Keyword search
    if (keyword && keyword.trim() !== "") {
      query.$or = [
        { fullName: { $regex: keyword, $options: "i" } },
        { latinName: { $regex: keyword, $options: "i" } },
        { email: { $regex: keyword, $options: "i" } },
        { phoneNumber: { $regex: keyword, $options: "i" } },
      ];
    }

    // ownedShares filtering
    if (company || minAmount) {
      query.ownedShares = {
        $elemMatch: {
          ...(company && {
            company: new mongoose.Types.ObjectId(company),
          }),
          ...(minAmount && {
            amount: { $gte: Number(minAmount) },
          }),
        },
      };
    }

    const skip = (page - 1) * limit;
    const sortOption = sort && sort.trim() !== "" ? sort : "-createdAt";

    const [investors, total] = await Promise.all([
      Investor.find(query).sort(sortOption).skip(skip).limit(Number(limit)),

      Investor.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      status: true,
      message: "success",
      pagination: {
        totalItems: total,
        totalPages,
        currentPage: Number(page),
        itemsPerPage: Number(limit),
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
      data: investors,
    });
  } catch (error) {
    console.error(`Error while fetching investors data: ${error.message}`);
    res.status(500).json({
      status: false,
      message: error.message,
    });
  }
});

/**
 * Weighted Average Cost portfolio builder
 * - BUY: increases qty and totalCost
 * - SELL: decreases qty and reduces totalCost by avgCost (realizedPnL tracked)
 */
function buildPortfolioAverageCost(transactions, fundById) {
  const map = new Map(); // assetId -> stats

  const getStats = (assetId) => {
    if (!map.has(assetId)) {
      map.set(assetId, {
        assetId,
        qty: 0,
        totalCost: 0, // cost basis of remaining position
        avgCost: 0,
        realizedPnL: 0,
      });
    }
    return map.get(assetId);
  };

  for (const tx of transactions) {
    const assetId = String(tx.assetId);
    const stats = getStats(assetId);

    const qty = Number(tx.quantity || 0);
    const price = Number(tx.pricePerShare || 0);

    if (!Number.isFinite(qty) || qty <= 0) continue;
    if (!Number.isFinite(price) || price < 0) continue;

    if (tx.side === "buy") {
      stats.qty += qty;
      stats.totalCost += qty * price;
      stats.avgCost = stats.qty > 0 ? stats.totalCost / stats.qty : 0;
      continue;
    }

    if (tx.side === "sell") {
      const sellQty = Math.min(qty, stats.qty); // safety guard
      if (sellQty <= 0) continue;

      const costRemoved = sellQty * stats.avgCost;

      stats.qty -= sellQty;
      stats.totalCost -= costRemoved;
      stats.realizedPnL += sellQty * (price - stats.avgCost);

      if (stats.qty <= 0) {
        stats.qty = 0;
        stats.totalCost = 0;
        stats.avgCost = 0;
      }
    }
  }

  const assets = [];
  let totalValue = 0;
  let totalInvested = 0;
  let totalUnrealizedPnL = 0;
  let totalRealizedPnL = 0;

  for (const s of map.values()) {
    const fund = fundById.get(String(s.assetId));
    const currentPrice = Number(fund?.sharePrice || 0);

    const value = s.qty * currentPrice;
    const invested = s.totalCost;
    const pnl = value - invested;

    totalValue += value;
    totalInvested += invested;
    totalUnrealizedPnL += pnl;
    totalRealizedPnL += s.realizedPnL;

    assets.push({
      assetType: "InvestmentFund",
      assetId: s.assetId,

      // fund meta for the UI card
      fund: fund
        ? {
            _id: fund._id,
            fullLegalName: fund.fullLegalName,
            nameAr: fund.nameAr,
            code: fund.code,
            logo: fund.logo,
            sharePrice: fund.sharePrice,
            active: fund.active,
          }
        : null,

      // position stats
      shares: s.qty,
      avgPrice: s.avgCost,
      currentPrice,
      value,
      invested,
      pnl,

      // optional
      realizedPnL: s.realizedPnL,
    });
  }

  // Sort nice (largest position first)
  assets.sort((a, b) => (b.value || 0) - (a.value || 0));

  return {
    summary: {
      totalValue,
      totalInvested,
      pnl: totalUnrealizedPnL, // matches your "pnl" card
      realizedPnL: totalRealizedPnL, // optional for later
    },
    assets,
  };
}

/**
 * GET /api/portfolio/investor/:holderId
 * Query:
 *   assetType=InvestmentFund (optional default)
 * Response:
 *   { summary, assets }
 */
exports.getInvestorPortfolio = asyncHandler(async (req, res, next) => {
  const { holderId } = req.params;

  console.log("triigerd");
  if (!mongoose.isValidObjectId(holderId)) {
    return next(new ApiError("Invalid holderId", 400));
  }

  // For now you want funds only (like your cards)
  const assetType = req.query.assetType || "InvestmentFund";

  if (assetType !== "InvestmentFund") {
    return next(new ApiError("Only InvestmentFund is supported for now", 400));
  }

  // 1) Load all transactions for this holder + fund assets
  const txs = await ShareTransaction.find({
    holderType: "investors",
    holderId,
    assetType: "InvestmentFund",
  })
    .select("assetId side quantity pricePerShare createdAt")
    .sort({ createdAt: 1 })
    .lean();

  // If no tx, return empty portfolio
  if (!txs.length) {
    return res.status(200).json({
      status: true,
      message: "success",
      data: {
        summary: { totalValue: 0, totalInvested: 0, pnl: 0, realizedPnL: 0 },
        assets: [],
      },
    });
  }

  // 2) Fetch funds used in these transactions (for price + name + logo)
  const assetIds = [...new Set(txs.map((t) => String(t.assetId)))];

  const funds = await InvestmentFund.find({ _id: { $in: assetIds } })
    .select("fullLegalName nameAr code logo sharePrice active")
    .lean();

  const fundById = new Map(funds.map((f) => [String(f._id), f]));

  // 3) Compute portfolio
  const portfolio = buildPortfolioAverageCost(txs, fundById);

  return res.status(200).json({
    status: true,
    message: "success",
    data: portfolio,
  });
});

// @desc Get one Investor
// @route GET /api/Investor/:id
// @access Private
exports.getOneInvestor = asyncHandler(async (req, res) => {
  try {
    // 1) Investor by authUserId
    const investor = await Investor.findOne({
      _id: req.params.id,
    }).lean();

    if (!investor) {
      return res.status(404).json({
        status: false,
        message: "Investor not found",
      });
    }

    // 2) Pagination (for holdings or transactions - you decide)
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    // 3) Holdings (shareholder rows) for this investor
    // holderType MUST match your schema enum exactly: "investors"
    const holdingsQuery = {
      holderType: "investors",
      holderId: investor._id,
    };

    const [holdings, totalHoldings] = await Promise.all([
      shareHolder
        .find(holdingsQuery)
        // populate assetId using refPath(assetType)
        .populate("assetId", "_id fullLegalName name code logo")
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      shareHolder.countDocuments(holdingsQuery),
    ]);

    // 4) Response
    return res.status(200).json({
      status: true,
      message: "success",
      data: investor,
      holdings: {
        total: totalHoldings,
        page,
        limit,
        totalPages: Math.ceil(totalHoldings / limit),
        items: holdings,
      },
    });
  } catch (error) {
    console.error(`Error fetching investor: ${error.message}`);
    return res.status(500).json({
      status: false,
      message: error.message,
    });
  }
});

// @desc Update investor
// @route PUT /api/investorShares/:id
// @access Private
exports.updateInvestorShares = asyncHandler(async (req, res) => {
  const {
    shares,
    type,
    counterpartyId,
    sharePrice,
    purchaseValue,
    description,
    companyId,
  } = req.body;

  if (!companyId) {
    return res.status(400).json({
      status: false,
      message: "companyId is required",
    });
  }

  const actor = await Investor.findById(req.params.id);
  const counterparty = await Investor.findById(counterpartyId);

  if (!actor || !counterparty) {
    return res.status(404).json({
      status: false,
      message: "Investor not found",
    });
  }

  // Helpers
  const getSharesEntry = (investor) =>
    investor.ownedShares.find((s) => s.company.toString() === companyId);

  const ensureEntry = (investor) => {
    let entry = getSharesEntry(investor);
    if (!entry) {
      entry = { company: companyId, amount: 0 };
      investor.ownedShares.push(entry);
    }
    return entry;
  };

  const actorShares = ensureEntry(actor);
  const counterpartyShares = ensureEntry(counterparty);

  // Validation
  if (type === "buy" && counterpartyShares.amount < shares) {
    return res.status(400).json({
      status: false,
      message: "Counterparty does not have enough shares",
    });
  }

  if (type === "sell" && actorShares.amount < shares) {
    return res.status(400).json({
      status: false,
      message: "Not enough shares to sell",
    });
  }

  // Perform trade
  if (type === "buy") {
    actorShares.amount += shares;
    counterpartyShares.amount -= shares;
  } else {
    actorShares.amount -= shares;
    counterpartyShares.amount += shares;
  }

  actor.deletable = false;
  counterparty.deletable = false;

  // Record both sides of transaction
  const buyerId = type === "buy" ? actor._id : counterparty._id;
  const sellerId = type === "sell" ? actor._id : counterparty._id;

  // await shareTransactionSchema.create([
  //   {
  //     investorId: buyerId,
  //     counterpartyId: sellerId,
  //     type: "buy",
  //     shares: Number(shares),
  //     sharePrice: Number(sharePrice),
  //     purchaseValue,
  //     description,
  //   },
  //   {
  //     investorId: sellerId,
  //     counterpartyId: buyerId,
  //     type: "sell",
  //     shares: Number(shares),
  //     sharePrice: Number(sharePrice),
  //     purchaseValue,
  //     description,
  //   },
  // ]);

  await actor.save();
  await counterparty.save();

  res.status(200).json({
    status: true,
    message: "Trade completed successfully",
    data: { actor, counterparty },
  });
});

// for updating
const storageDisk = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/Investor");
  },
  filename: (req, file, cb) => {
    const ext = file.mimetype.startsWith("image/")
      ? ".webp"
      : file.mimetype === "application/pdf"
      ? ".pdf"
      : "";

    const safeFieldname = file.fieldname.replace(/[^a-zA-Z0-9_-]/g, "_");
    const filename = `Investor-${uuidv4()}-${Date.now()}-${safeFieldname}${ext}`;
    cb(null, filename);
  },
});

const uploadDisk = multer({
  storage: storageDisk,
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype.startsWith("image/") ||
      file.mimetype === "application/pdf"
    ) {
      cb(null, true);
    } else {
      cb(new Error("Only image and PDF files are allowed!"), false);
    }
  },
});

exports.uploadInvestorImagesDisk = uploadDisk.any();

exports.processInvestorFiles = asyncHandler(async (req, res, next) => {
  if (!req.files || req.files.length === 0) return next();

  req.body.attachments = [];

  req.files.forEach((file, i) => {
    const key =
      req.body[`${file.fieldname}_key`] ||
      file.fieldname.replace(/^attachment_\d+/, "attachment");

    if (file.fieldname === "profileImage") {
      req.body.profileImage = file.filename;
    } else {
      req.body.attachments.push({
        key,
        fileUrl: file.filename,
      });
    }
  });

  next();
});

// @desc Update investor
// @route PUT /api/investor/:id
// @access Private
exports.updateInvestor = asyncHandler(async (req, res, next) => {
  try {
    let existingInvestor;
    if (req.body.role === "investor") {
      existingInvestor = await Investor.findOne({ authUserId: req.params.id });
    } else {
      existingInvestor = await applicantModel.findOne({
        authUserId: req.params.id,
      });
    }

    if (!existingInvestor) {
      return res.status(404).json({
        status: false,
        message: "Investor not found",
      });
    }

    const fields = ["fullName", "phone", "email", "birthDate", "latinName"];
    fields.forEach((f) => {
      if (req.body[f]) existingInvestor[f] = req.body[f];
    });

    if (req.body.ibanNumbers) {
      existingInvestor.ibanNumbers = JSON.parse(req.body.ibanNumbers);
    }

    // === Keep-list approach: delete attachments that are NOT included in existingAttachments ===
    if (typeof req.body.existingAttachments !== "undefined") {
      let keepKeys = [];
      try {
        keepKeys = JSON.parse(req.body.existingAttachments || "[]");
      } catch (err) {
        console.warn("Invalid existingAttachments payload:", err.message);
        keepKeys = [];
      }

      existingInvestor.attachments = existingInvestor.attachments.filter(
        (att) => {
          const shouldKeep = keepKeys.includes(att.key);
          if (!shouldKeep) {
            try {
              fs.unlinkSync(path.join("uploads/Investor", att.fileUrl));
            } catch (err) {
              console.warn("Failed to delete removed attachment:", err.message);
            }
          }
          return shouldKeep;
        }
      );
    }

    // === Handle uploaded files (req.files is an array from upload.any()) ===
    if (req.files && req.files.length > 0) {
      req.files.forEach((file) => {
        // file.fieldname is like "attachment_0" or "profileImage"
        // the client sends attachment_{index}_key for new files
        const key =
          req.body[`${file.fieldname}_key`] ||
          file.fieldname.replace(/^attachment_\d+/, "attachment");

        if (file.fieldname === "profileImage") {
          // delete old profile image
          if (existingInvestor.profileImage) {
            try {
              fs.unlinkSync(
                path.join("uploads/Investor", existingInvestor.profileImage)
              );
            } catch (err) {
              console.warn("Failed to delete old profile image:", err.message);
            }
          }
          existingInvestor.profileImage = file.filename;
        } else {
          const index = existingInvestor.attachments.findIndex(
            (att) => att.key === key
          );
          const newFile = { key, fileUrl: file.filename };

          if (index > -1) {
            // replace: delete old file then set new
            try {
              fs.unlinkSync(
                path.join(
                  "uploads/Investor",
                  existingInvestor.attachments[index].fileUrl
                )
              );
            } catch (err) {
              console.warn("Failed to delete old attachment:", err.message);
            }
            existingInvestor.attachments[index] = newFile;
          } else {
            existingInvestor.attachments.push(newFile);
          }
        }
      });
    }

    await authUserModel.findOneAndUpdate(
      { _id: req.params.id },
      { phone: req.body.phone }
    );
    const updatedInvestor = await existingInvestor.save();
    await createNotification({
      user: updatedInvestor.authUserId,
      type: "success",
      title: "PROFILE_UPDATED",
      message: "PROFILE_UPDATE_MSG",
    });

    res.status(200).json({
      status: true,
      message: "Investor updated successfully",
      data: updatedInvestor,
    });
  } catch (error) {
    console.error("Error updating investor:", error.message);
    res.status(500).json({
      status: false,
      message: error.message,
    });
  }
});

// @desc Delete Investor
// @route DELETE /api/Investor/:id
// @access Private
exports.deleteInvestor = asyncHandler(async (req, res, next) => {
  try {
    // Find the investor first
    const investor = await Investor.findById(req.params.id);

    if (!investor) {
      return res.status(404).json({
        status: false,
        message: "Investor not found",
      });
    }

    // Check if investor is deletable
    if (!investor.deletable) {
      return res.status(403).json({
        status: false,
        message: "This investor cannot be deleted.",
      });
    }

    // Delete the investor
    await Investor.deleteOne({ _id: investor._id });

    res.status(200).json({
      status: true,
      message: "Investor deleted successfully.",
    });
  } catch (error) {
    console.error(`Error deleting Investor: ${error.message}`);
    return res.status(500).json({
      status: false,
      message: error.message,
    });
  }
});
