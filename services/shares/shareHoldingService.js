const asyncHandler = require("express-async-handler");
const mongoose = require("mongoose");
const ShareHolding = require("../../models/shares/shareHoldingSchema");

exports.getSharesHoldings = asyncHandler(async (req, res) => {
  const {
    holderType,
    holderId,
    assetType,
    assetId,
    page = 1,
    limit = 10,
  } = req.query;

  // list filter (mongoose will cast in find)
  const filter = {};
  if (holderType) filter.holderType = holderType;
  if (holderId) filter.holderId = holderId;
  if (assetType) filter.assetType = assetType;
  if (assetId) filter.assetId = assetId;

  // ✅ summary match (YOU must cast for aggregate)
  const summaryMatch = {};
  if (assetType) summaryMatch.assetType = assetType;
  if (assetId && mongoose.Types.ObjectId.isValid(assetId)) {
    summaryMatch.assetId = new mongoose.Types.ObjectId(assetId);
  }

  const pageNum = Math.max(Number(page), 1);
  const limitNum = Math.min(Math.max(Number(limit), 1), 100);
  const skip = (pageNum - 1) * limitNum;

  const [data, total, summaryAgg] = await Promise.all([
    ShareHolding.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate({
        path: "holderId",
        select: "fullName nationalId fullLegalName",
      })
      .populate({ path: "assetId", select: "fullLegalName tradeName crn" })
      .lean(),

    ShareHolding.countDocuments(filter),

    ShareHolding.aggregate([
      { $match: summaryMatch },
      {
        $group: {
          _id: null,
          totalShares: { $sum: "$shares" },
          holders: {
            $addToSet: {
              $concat: ["$holderType", ":", { $toString: "$holderId" }],
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          totalShares: 1,
          holdersCount: { $size: "$holders" },
        },
      },
    ]),
  ]);

  const summary = summaryAgg?.[0] || { totalShares: 0, holdersCount: 0 };

  return res.status(200).json({
    status: true,
    summary,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    },
    data,
  });
});

exports.getHolderPortfolioSummary = asyncHandler(async (req, res) => {
  const { holderType, holderId } = req.query;

  if (!holderType || !holderId) {
    return res.status(400).json({
      status: false,
      message: "holderType and holderId are required",
    });
  }

  if (!mongoose.Types.ObjectId.isValid(holderId)) {
    return res.status(400).json({
      status: false,
      message: "Invalid holderId",
    });
  }

  const holderObjectId = new mongoose.Types.ObjectId(holderId);

  const result = await ShareHolding.aggregate([
    {
      $match: {
        holderType,
        holderId: holderObjectId,
      },
    },

    // Lookup companies for assetType=ClientCompany
    {
      $lookup: {
        from: "clientcompanies",
        let: { aid: "$assetId", atype: "$assetType" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$$atype", "ClientCompany"] },
                  { $eq: ["$_id", "$$aid"] },
                ],
              },
            },
          },
          {
            $project: { fullLegalName: 1, tradeName: 1, crn: 1, sharePrice: 1 },
          },
        ],
        as: "company",
      },
    },

    // Lookup funds for assetType=InvestmentFund
    {
      $lookup: {
        from: "investmentfunds",
        let: { aid: "$assetId", atype: "$assetType" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$$atype", "InvestmentFund"] },
                  { $eq: ["$_id", "$$aid"] },
                ],
              },
            },
          },
          { $project: { fullLegalName: 1, sharePrice: 1 } },
        ],
        as: "fund",
      },
    },

    // Normalize the asset doc
    {
      $addFields: {
        assetDoc: {
          $cond: [
            { $eq: ["$assetType", "ClientCompany"] },
            { $first: "$company" },
            { $first: "$fund" },
          ],
        },
      },
    },

    // Compute price + value
    {
      $addFields: {
        sharePrice: { $ifNull: ["$assetDoc.sharePrice", 0] },
        value: {
          $multiply: [
            { $ifNull: ["$shares", 0] },
            { $ifNull: ["$assetDoc.sharePrice", 0] },
          ],
        },
        assetName: {
          $ifNull: [
            "$assetDoc.fullLegalName",
            { $ifNull: ["$assetDoc.tradeName", "—"] },
          ],
        },
      },
    },

    // Clean output rows
    {
      $project: {
        _id: 0,
        assetType: 1,
        assetId: 1,
        assetName: 1,
        shares: 1,
        sharePrice: 1,
        value: 1,
      },
    },

    // Sort (optional)
    { $sort: { value: -1 } },

    // Build summary + breakdown in one response
    {
      $group: {
        _id: null,
        totalShares: { $sum: "$shares" },
        totalValue: { $sum: "$value" },
        breakdown: { $push: "$$ROOT" },
      },
    },
    {
      $project: {
        _id: 0,
        totalShares: 1,
        totalValue: 1,
        breakdown: 1,
      },
    },
  ]);

  const payload = result?.[0] || {
    totalShares: 0,
    totalValue: 0,
    breakdown: [],
  };

  return res.status(200).json({
    status: true,
    holder: { holderType, holderId },
    summary: {
      totalShares: payload.totalShares,
      totalValue: payload.totalValue,
    },
    breakdown: payload.breakdown,
  });
});
