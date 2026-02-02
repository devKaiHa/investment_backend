const asyncHandler = require("express-async-handler");
const ShareTradeRequestLog = require("../../models/shares/shareTradeRequestLogSchema");
const ShareTradeRequest = require("../../models/shares/shareTradeRequestSchema");
const { default: mongoose } = require("mongoose");
const investorModel = require("../../models/investorModel");
const shareHoldingSchema = require("../../models/shares/shareHoldingSchema");

/**
 * @desc Create share trade request (buy / sell)
 * @route POST /api/trade-requests
 * @access Private (Investor)
 */
exports.createTradeRequest = asyncHandler(async (req, res) => {
  const tradeRequest = await ShareTradeRequest.create({
    ...req.body,
    investor: req.body.userId,
  });

  // Create log
  await ShareTradeRequestLog.create({
    tradeRequest: tradeRequest._id,
    action: "created",
    performedBy: req.body.userId,
    performedByType: "investors",
    newStatus: tradeRequest.requestStatus,
  });

  res.status(201).json({
    status: true,
    message: "success",
    data: tradeRequest,
  });
});

/**
 * @desc Get all trade requests for investor
 * @route GET /api/trade-requests/investor/:id
 * @access Private
 */
exports.getInvestorTradeRequests = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, sort = "-createdAt" } = req.query;
  const skip = (page - 1) * limit;

  console.log(req.query);
  const query = { investor: req.params.id };

  const [data, total] = await Promise.all([
    ShareTradeRequest.find(query)
      .sort(sort)
      .skip(skip)
      .limit(Number(limit))
      .populate("source"),

    ShareTradeRequest.countDocuments(query),
  ]);

  res.status(200).json({
    status: true,
    message: "success",
    pagination: {
      totalItems: total,
      totalPages: Math.ceil(total / limit),
      currentPage: Number(page),
    },
    data,
  });
});

/**
 * @desc Get all trade requests (Admin)
 * @route GET /api/trade-requests
 * @access Private (Admin)
 */
exports.getAllTradeRequests = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    sort = "-createdAt",
    tradeType,
    requestStatus,
    keyword,
  } = req.query;

  const skip = (page - 1) * limit;

  const query = {
    ...(tradeType && { tradeType }),
    ...(requestStatus && { requestStatus }),
  };

  // keyword search
  if (keyword?.trim()) {
    query.$or = [
      { tradeType: { $regex: keyword, $options: "i" } },
      { paymentStatus: { $regex: keyword, $options: "i" } },
    ];
  }

  const [data, total] = await Promise.all([
    ShareTradeRequest.find(query)
      .populate("investor", "fullName phone")
      .populate("source", "fullLegalName phoneNumber")
      .sort(sort)
      .skip(skip)
      .limit(Number(limit))
      .lean(),

    ShareTradeRequest.countDocuments(query),
  ]);

  res.status(200).json({
    status: true,
    message: "success",
    pagination: {
      totalItems: total,
      totalPages: Math.ceil(total / limit),
      currentPage: Number(page),
    },
    data,
  });
});

/**
 * @desc Get single trade request
 * @route GET /api/trade-requests/:id
 * @access Private
 */
exports.getTradeRequestById = asyncHandler(async (req, res) => {
  const request = await ShareTradeRequest.findById(req.params.id)
    .populate("investor", "_id fullName phoneNumber")
    .populate("source", "_id fullLegalName");

  const logs = await ShareTradeRequestLog.find({
    tradeRequest: req.params.id,
  }).populate("performedBy");

  const holdings = await shareHoldingSchema.find({
    holderId: request.source._id,
  });

  if (!request) {
    return res.status(404).json({
      status: false,
      message: "Trade request not found",
    });
  }

  res.status(200).json({
    status: true,
    message: "success",
    data: request,
    logs,
    holdings,
  });
});

/**
 * @desc Update trade request status (approve / reject / etc.)
 * @route PUT /api/trade-requests/:id
 * @access Private (Admin)
 */
exports.updateTradeRequest = asyncHandler(async (req, res) => {
  const request = await ShareTradeRequest.findById(req.params.id);

  if (!request) {
    return res.status(404).json({
      status: false,
      message: "Trade request not found",
    });
  }

  const previousStatus = request.requestStatus;

  Object.assign(request, req.body);
  await request.save();

  // Log action
  await ShareTradeRequestLog.create({
    tradeRequest: request._id,
    action:
      previousStatus !== request.requestStatus
        ? request.requestStatus === "approved"
          ? "approved"
          : request.requestStatus === "rejected"
            ? "rejected"
            : request.requestStatus === "confirmed"
              ? "confirmed"
              : "updated"
        : "updated",
    performedBy: req.body.userId,
    performedByType: "Employee",
    previousStatus,
    newStatus: request.requestStatus,
    note: req.body.rejectionReason || "",
  });

  res.status(200).json({
    status: true,
    message: "success",
    data: request,
  });
});

/**
 * @desc Delete trade request
 * @route DELETE /api/trade-requests/:id
 * @access Private
 */
exports.deleteTradeRequest = asyncHandler(async (req, res) => {
  const request = await ShareTradeRequest.findByIdAndDelete(req.params.id);

  if (!request) {
    return res.status(404).json({
      status: false,
      message: "Trade request not found",
    });
  }

  res.status(200).json({
    status: true,
    message: "success",
  });
});
