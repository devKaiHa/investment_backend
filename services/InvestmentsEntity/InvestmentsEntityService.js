const asyncHandler = require("express-async-handler");
const mongoose = require("mongoose");
const InvestmentEntityLog = require("../../models/InvestmentsEntity/investmentEntityLog");
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
  const skip = (page - 1) * limit;

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

  // Normalize results
  const combined = [
    ...companies.map((item) => ({
      ...item,
      entityType: "ClientCompany",
    })),
    ...funds.map((item) => ({
      ...item,
      entityType: "InvestmentFund",
    })),
  ];

  // Sort
  const sortField = sort.replace("-", "");
  const sortOrder = sort.startsWith("-") ? -1 : 1;

  combined.sort((a, b) => {
    if (!a[sortField] || !b[sortField]) return 0;
    return a[sortField] > b[sortField] ? sortOrder : -sortOrder;
  });

  const totalItems = combined.length;
  const paginatedData = combined.slice(skip, skip + Number(limit));

  res.status(200).json({
    status: true,
    message: "success",
    pagination: {
      totalItems,
      totalPages: Math.ceil(totalItems / limit),
      currentPage: Number(page),
      itemsPerPage: Number(limit),
      hasNextPage: skip + Number(limit) < totalItems,
      hasPreviousPage: page > 1,
    },
    data: paginatedData,
  });
});
