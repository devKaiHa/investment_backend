const mongoose = require("mongoose");
const asyncHandler = require("express-async-handler");
const InvestmentFund = require("../../models/InvestmentsEntity/investmentFundModel");
const Holding = require("../../models/shares/shareHoldingSchema");
const InvestmentEntityLog = require("../../models/InvestmentsEntity/investmentEntityLog");

exports.createInvestmentFund = asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      fullLegalName,
      sharePrice,
      initialShares,
      minInvestShare,
      maxInvestShare,
    } = req.body;

    const price = Number(sharePrice);
    const shares = Number(initialShares);
    const minS = Number(minInvestShare);
    const maxS = Number(maxInvestShare);

    // minimal validations
    if (!fullLegalName?.trim()) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(400)
        .json({ status: false, message: "fullLegalName is required" });
    }

    if (!Number.isFinite(price) || price <= 0) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(400)
        .json({ status: false, message: "sharePrice must be > 0" });
    }

    if (!Number.isInteger(shares) || shares <= 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        status: false,
        message: "initialShares must be a positive integer",
      });
    }

    if (
      !Number.isInteger(minS) ||
      minS < 1 ||
      !Number.isInteger(maxS) ||
      maxS < 1
    ) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        status: false,
        message: "minInvestShare/maxInvestShare must be integers >= 1",
      });
    }

    if (minS > maxS) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        status: false,
        message: "minInvestShare cannot be greater than maxInvestShare",
      });
    }

    if (maxS > shares) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        status: false,
        message: "maxInvestShare cannot exceed initialShares",
      });
    }

    // 1) Create fund
    const [fund] = await InvestmentFund.create(
      [
        {
          fullLegalName: fullLegalName.trim(),
          sharePrice: price,
          initialShares: shares,
          minInvestShare: minS,
          maxInvestShare: maxS,
          shareIssued: true,
        },
      ],
      { session }
    );

    // 2) Holding: fund treasury holds its own issued shares
    await Holding.updateOne(
      {
        holderType: "InvestmentFund",
        holderId: fund._id,
        assetType: "InvestmentFund",
        assetId: fund._id,
      },
      { $set: { shares } },
      { upsert: true, session }
    );

    // 3) Entity log: ISSUE_SHARES
    await InvestmentEntityLog.create(
      [
        {
          entityType: "InvestmentFund",
          entityId: fund._id,
          actorId: req.user?._id || null,
          action: "ISSUE_SHARES",
          changes: [
            { field: "sharePrice", before: "", after: String(price) },
            { field: "initialShares", before: "", after: String(shares) },
            { field: "minInvestShare", before: "", after: String(minS) },
            { field: "maxInvestShare", before: "", after: String(maxS) },
            { field: "shareIssued", before: "false", after: "true" },
          ],
          note: {
            en: "Fund created and initial shares issued into fund treasury holding.",
            ar: "تم إنشاء الصندوق وإصدار الأسهم الأولية وإضافتها إلى حيازة الصندوق (الخزينة).",
          },
        },
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    return res.status(201).json({
      status: true,
      message: "Investment fund created successfully",
      data: fund,
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
});

exports.updateInvestmentFund = asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const { sharePrice, minInvestShare, maxInvestShare } = req.body;

    const fund = await InvestmentFund.findById(id).session(session);
    if (!fund) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(404)
        .json({ status: false, message: "Investment fund not found" });
    }

    const changes = [];

    // sharePrice
    if (sharePrice !== undefined) {
      const price = Number(sharePrice);
      if (!Number.isFinite(price) || price <= 0) {
        await session.abortTransaction();
        session.endSession();
        return res
          .status(400)
          .json({ status: false, message: "sharePrice must be > 0" });
      }
      if (fund.sharePrice !== price) {
        changes.push({
          field: "sharePrice",
          before: String(fund.sharePrice),
          after: String(price),
        });
        fund.sharePrice = price;
      }
    }

    // minInvestShare
    if (minInvestShare !== undefined) {
      const minS = Number(minInvestShare);
      if (!Number.isInteger(minS) || minS < 1) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          status: false,
          message: "minInvestShare must be integer >= 1",
        });
      }
      if (fund.minInvestShare !== minS) {
        changes.push({
          field: "minInvestShare",
          before: String(fund.minInvestShare),
          after: String(minS),
        });
        fund.minInvestShare = minS;
      }
    }

    // maxInvestShare
    if (maxInvestShare !== undefined) {
      const maxS = Number(maxInvestShare);
      if (!Number.isInteger(maxS) || maxS < 1) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          status: false,
          message: "maxInvestShare must be integer >= 1",
        });
      }
      if (fund.maxInvestShare !== maxS) {
        changes.push({
          field: "maxInvestShare",
          before: String(fund.maxInvestShare),
          after: String(maxS),
        });
        fund.maxInvestShare = maxS;
      }
    }

    // validate min/max relationship if anything changed
    if (minInvestShare !== undefined || maxInvestShare !== undefined) {
      if (Number(fund.minInvestShare) > Number(fund.maxInvestShare)) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          status: false,
          message: "minInvestShare cannot be greater than maxInvestShare",
        });
      }

      // optional rule (recommended): maxInvestShare <= initialShares
      if (Number(fund.maxInvestShare) > Number(fund.initialShares)) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          status: false,
          message: "maxInvestShare cannot exceed initialShares",
        });
      }
    }

    // Nothing changed => no log
    if (changes.length === 0) {
      await session.commitTransaction();
      session.endSession();
      return res.status(200).json({
        status: true,
        message: "No changes applied",
        data: fund,
      });
    }

    await fund.save({ session });

    // Log UPDATE_INVEST_INFO
    await InvestmentEntityLog.create(
      [
        {
          entityType: "InvestmentFund",
          entityId: fund._id,
          actorId: req.user?._id || null,
          action: "UPDATE_INVEST_INFO",
          changes,
          note: {
            en: "Fund invest info updated (sharePrice/min/max).",
            ar: "تم تحديث معلومات الاستثمار للصندوق (سعر السهم/الحد الأدنى/الحد الأقصى).",
          },
        },
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({
      status: true,
      message: "Investment fund updated successfully",
      data: fund,
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
});

// GET /investment-funds
exports.getAllInvestmentFunds = asyncHandler(async (req, res) => {
  const funds = await InvestmentFund.find().sort({ createdAt: -1 }).lean();

  res.status(200).json({
    status: true,
    count: funds.length,
    data: funds,
  });
});

// GET /investment-funds/:id
exports.getOneInvestmentFund = asyncHandler(async (req, res) => {
  const { id } = req.params;
  console.log("ss");
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ status: false, message: "Invalid fund id" });
  }

  const fundId = new mongoose.Types.ObjectId(id);

  const [fund, holding] = await Promise.all([
    InvestmentFund.findById(fundId).lean(),
    Holding.findOne({
      holderType: "InvestmentFund",
      holderId: fundId,
      assetType: "InvestmentFund",
      assetId: fundId,
    })
      .select("shares -_id")
      .lean(),
  ]);

  if (!fund) {
    return res.status(404).json({
      status: false,
      message: "Investment fund not found",
    });
  }

  return res.status(200).json({
    status: true,
    data: {
      ...fund,
      treasuryShares: holding?.shares ?? 0, // ✅ this is what you care about
    },
  });
});
