const asyncHandler = require("express-async-handler");
const mongoose = require("mongoose");
const InvestmentEntityLog = require("../../models/InvestmentsEntity/investmentEntityLog");

exports.getInvestmentEntityLog = asyncHandler(async (req, res) => {
  const { entityType, entityId, actorId, action } = req.query;
  const page = Math.max(Number(req.query.page || 1), 1);
  const limit = Math.min(Math.max(Number(req.query.limit || 10), 1), 100);
  const skip = (page - 1) * limit;

  const filter = {};

  if (entityType) filter.entityType = entityType;
  if (action) filter.action = action;

  if (entityId) {
    if (!mongoose.Types.ObjectId.isValid(entityId)) {
      return res
        .status(400)
        .json({ status: false, message: "Invalid entityId" });
    }
    filter.entityId = entityId;
  }

  if (actorId) {
    if (!mongoose.Types.ObjectId.isValid(actorId)) {
      return res
        .status(400)
        .json({ status: false, message: "Invalid actorId" });
    }
    filter.actorId = actorId;
  }

  const [data, total] = await Promise.all([
    InvestmentEntityLog.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    InvestmentEntityLog.countDocuments(filter),
  ]);

  res.status(200).json({
    status: true,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    data,
  });
});
