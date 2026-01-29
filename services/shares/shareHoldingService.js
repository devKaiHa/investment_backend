const asyncHandler = require("express-async-handler");
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

  const filter = {};
  if (holderType) filter.holderType = holderType;
  if (holderId) filter.holderId = holderId;
  if (assetType) filter.assetType = assetType;
  if (assetId) filter.assetId = assetId;

  const pageNum = Math.max(Number(page), 1);
  const limitNum = Math.min(Math.max(Number(limit), 1), 100); // safety cap
  const skip = (pageNum - 1) * limitNum;

  const [data, total] = await Promise.all([
    ShareHolding.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),

    ShareHolding.countDocuments(filter),
  ]);

  res.status(200).json({
    status: true,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    },
    data,
  });
});
