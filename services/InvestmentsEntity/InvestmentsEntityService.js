const asyncHandler = require("express-async-handler");
const mongoose = require("mongoose");
const InvestmentEntityLog = require("../../models/InvestmentsEntity/investmentEntityLog");
const shareHoldings = require("../../models/shares/shareHoldingSchema");
const InvestmentFund = require("../../models/InvestmentsEntity/investmentFundModel");
const ClientCompanyModel = require("../../models/InvestmentsEntity/clientCompanyModel");

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

exports.getAllInvestmentEntities = asyncHandler(async (req, res) => {
  const {
    keyword,
    page = 1,
    limit = 10,
    sort = "-createdAt",
    active = "true",
  } = req.query;

  const isActive = active === "true";
  const pageNum = Math.max(Number(page), 1);
  const limitNum = Math.min(Math.max(Number(limit), 1), 100);
  const skip = (pageNum - 1) * limitNum;

  const query = { active: isActive };

  if (keyword?.trim()) {
    query.$or = [
      { fullLegalName: { $regex: keyword, $options: "i" } },
      { tradeName: { $regex: keyword, $options: "i" } },
      { email: { $regex: keyword, $options: "i" } },
      { phoneNumber: { $regex: keyword, $options: "i" } },
    ];
  }

  const [companies, funds] = await Promise.all([
    ClientCompanyModel.find(query).lean(),
    InvestmentFund.find(query).lean(),
  ]);

  // ✅ Add holdings ONLY for funds (treasury: fund holds itself)
  const fundIds = funds.map((f) => f._id);

  let holdingsByFundId = new Map();
  if (fundIds.length) {
    const holdings = await shareHoldings
      .find({
        holderType: "InvestmentFund",
        holderId: { $in: fundIds },
        assetType: "InvestmentFund",
        assetId: { $in: fundIds },
      })
      .select("holderId shares")
      .lean();

    holdingsByFundId = new Map(
      holdings.map((h) => [String(h.holderId), Number(h.shares || 0)])
    );
  }

  const fundsWithHoldings = funds.map((f) => ({
    ...f,
    entityType: "InvestmentFund",
    treasuryShares: holdingsByFundId.get(String(f._id)) ?? 0,
  }));

  const companiesNormalized = companies.map((c) => ({
    ...c,
    entityType: "ClientCompany",
  }));

  const combined = [...companiesNormalized, ...fundsWithHoldings];

  // Sort
  const sortField = String(sort).replace("-", "");
  const sortOrder = String(sort).startsWith("-") ? -1 : 1;

  combined.sort((a, b) => {
    const av = a?.[sortField];
    const bv = b?.[sortField];
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    return av > bv ? sortOrder : av < bv ? -sortOrder : 0;
  });

  const totalItems = combined.length;
  const paginatedData = combined.slice(skip, skip + limitNum);

  return res.status(200).json({
    status: true,
    message: "success",
    pagination: {
      totalItems,
      totalPages: Math.ceil(totalItems / limitNum),
      currentPage: pageNum,
      itemsPerPage: limitNum,
      hasNextPage: skip + limitNum < totalItems,
      hasPreviousPage: pageNum > 1,
    },
    data: paginatedData,
  });
});
