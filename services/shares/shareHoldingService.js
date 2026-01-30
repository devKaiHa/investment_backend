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
