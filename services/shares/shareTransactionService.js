const mongoose = require("mongoose");
const asyncHandler = require("express-async-handler");
const ShareTransaction = require("../../models/shares/shareTransactionModel");

exports.getShareTransactions = asyncHandler(async (req, res) => {
  const {
    assetType,
    assetId,

    holderType,
    holderId,
    type,
    side,

    page = 1,
    limit = 20,
    sort = "-createdAt",
  } = req.query;

  /* ========= validations ========= */

  if (!assetId && !holderId) {
    return res.status(400).json({
      status: false,
      message: "Either assetId or holderId is required",
    });
  }

  if (assetType) {
    const allowedAssetTypes = ["ClientCompany", "InvestmentFund"];
    if (!allowedAssetTypes.includes(assetType)) {
      return res.status(400).json({
        status: false,
        message: `Invalid assetType. Allowed: ${allowedAssetTypes.join(", ")}`,
      });
    }
  }

  if (assetId && !mongoose.Types.ObjectId.isValid(assetId)) {
    return res.status(400).json({
      status: false,
      message: "Invalid assetId",
    });
  }

  if (holderId && !mongoose.Types.ObjectId.isValid(holderId)) {
    return res.status(400).json({
      status: false,
      message: "Invalid holderId",
    });
  }

  /* ========= build query ========= */

  const query = {};

  if (assetType) query.assetType = assetType;
  if (assetId) query.assetId = new mongoose.Types.ObjectId(assetId);

  if (holderType) query.holderType = holderType;
  if (holderId) query.holderId = new mongoose.Types.ObjectId(holderId);

  if (type) query.type = type;
  if (side) query.side = side;

  const skip = (Number(page) - 1) * Number(limit);

  /* ========= fetch ========= */

  const [rows, total] = await Promise.all([
    ShareTransaction.find(query)
      .populate("holderId", "_id fullName fullLegalName")
      .sort(sort)
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    ShareTransaction.countDocuments(query),
  ]);

  res.status(200).json({
    status: true,
    message: "success",
    pagination: {
      totalItems: total,
      totalPages: Math.ceil(total / Number(limit)),
      currentPage: Number(page),
      itemsPerPage: Number(limit),
      hasNextPage: skip + Number(limit) < total,
      hasPreviousPage: Number(page) > 1,
    },
    data: rows,
  });
});
