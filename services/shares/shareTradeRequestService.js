const asyncHandler = require("express-async-handler");

const ShareTradeRequest = require("../../models/shares/shareTradeRequestModel");
const mongoose = require("mongoose");
const sharesHolderModel = require("../../models/shares/sharesHolderModel");
const shareTradeRequestLogModel = require("../../models/shares/shareTradeRequestLogModel");
const shareTransactionModel = require("../../models/shares/shareTransactionModel");
const { createNotification } = require("../utils/notificationService");
const investorModel = require("../../models/investorModel");

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
  await shareTradeRequestLogModel.create({
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
    paymentStatus,
    sourceType,
    keyword,
  } = req.query;

  const pageNum = Math.max(Number(page), 1);
  const limitNum = Math.min(Math.max(Number(limit), 1), 100);
  const skip = (pageNum - 1) * limitNum;

  const query = {
    ...(tradeType && { tradeType }),
    ...(requestStatus && { requestStatus }),
    ...(paymentStatus && { paymentStatus }),
    ...(sourceType && { sourceType }),
  };

  // keyword search
  if (keyword?.trim()) {
    const k = keyword.trim();
    query.$or = [
      { tradeType: { $regex: k, $options: "i" } },
      { paymentStatus: { $regex: k, $options: "i" } },
      { requestStatus: { $regex: k, $options: "i" } }, // (optional but useful)
      { sourceType: { $regex: k, $options: "i" } }, // (optional)
    ];
  }

  const [data, total] = await Promise.all([
    ShareTradeRequest.find(query)
      .populate("investor", "fullName phone")
      .populate("source", "fullLegalName phoneNumber")
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .lean(),
    ShareTradeRequest.countDocuments(query),
  ]);

  res.status(200).json({
    status: true,
    message: "success",
    pagination: {
      totalItems: total,
      totalPages: Math.ceil(total / limitNum),
      currentPage: pageNum,
      itemsPerPage: limitNum,
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
    .populate("investor", "_id fullName phone")
    .populate("source", "_id fullLegalName");
  const logs = await shareTradeRequestLogModel
    .find({
      tradeRequest: req.params.id,
    })
    .populate("performedBy");

  const holdings = await sharesHolderModel.find({
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

  // 1) Prevent any edits once confirmed (recommended)
  if (request.requestStatus === "confirmed") {
    return res.status(400).json({
      status: false,
      message: "Confirmed trade requests cannot be edited",
    });
  }

  const investorObj = await investorModel.findById(request.investor._id);
  if (!investorObj) {
    return res.status(404).json({
      status: false,
      message: "No user found with the ID associated with that request",
    });
  }

  const previousStatus = request.requestStatus;

  // 2) Block confirming from here (must go through confirm endpoint)
  if (req.body?.requestStatus === "confirmed") {
    return res.status(400).json({
      status: false,
      message: "Use the confirm endpoint to confirm a trade request",
    });
  }

  const allowedNextByCurrent = {
    pending: ["approved", "rejected"],
    approved: ["check_payment", "rejected"],
    check_payment: ["rejected"], // confirm only via confirm service
    rejected: [], // optional: locked
  };

  if (req.body?.requestStatus && req.body.requestStatus !== previousStatus) {
    const next = req.body.requestStatus;
    const allowedNext = allowedNextByCurrent[previousStatus] || [];

    if (!allowedNext.includes(next)) {
      return res.status(400).json({
        status: false,
        message: `Invalid status transition: ${previousStatus} -> ${next}`,
      });
    }
  }

  // 4) Optional: restrict which fields can be updated here (best practice)
  // Prevent accidental changes to core trade details.
  const allowedFields = [
    "requestStatus",
    "paymentStatus",
    "rejectionReason",
    "paymentConfirmationDocument", // if you added it
    "description",
  ];

  const updates = {};
  for (const key of allowedFields) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }

  // If rejecting, require rejectionReason
  if (
    updates.requestStatus === "rejected" &&
    !String(updates.rejectionReason || "").trim()
  ) {
    return res.status(400).json({
      status: false,
      message: "rejectionReason is required when rejecting a request",
    });
  }

  // Apply & save
  Object.assign(request, updates);
  await request.save();

  // 5) Log action (clean mapping)
  const statusToAction = {
    approved: "approved",
    rejected: "rejected",
    check_payment: "updated", // or "check_payment" if you want a dedicated log action
  };

  const action =
    previousStatus !== request.requestStatus
      ? statusToAction[request.requestStatus] || "updated"
      : "updated";

  await createNotification({
    user: investorObj.authUserId,
    type: "warning",
    title: "SHARES_REQUEST_UPDATED",
    message: "SHARES_REQUEST_UPDATE_MSG",
    meta: {
      tradeId: request._id,
      reason: request.rejectionReason ?? "",
      previousStatus: previousStatus,
      newStatus: request.requestStatus,
    },
  });

  await shareTradeRequestLogModel.create({
    tradeRequest: request._id,
    action,
    performedBy: req.body.userId,
    performedByType: "Employee",
    previousStatus,
    newStatus: request.requestStatus,
    note: request.rejectionReason || "",
  });

  res.status(200).json({
    status: true,
    message: "success",
    data: request,
  });
});

exports.confirmTradeRequest = asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const requestId = req.params.id;

    // IMPORTANT: send userId from client in body
    const performedByUserId = req.body.userId;

    const request =
      await ShareTradeRequest.findById(requestId).session(session);
    if (!request) {
      await session.abortTransaction();
      return res
        .status(404)
        .json({ status: false, message: "Trade request not found" });
    }

    // Idempotency
    if (request.requestStatus === "confirmed") {
      await session.commitTransaction();
      return res.status(200).json({
        status: true,
        message: "Already confirmed",
        data: request,
      });
    }

    // Allow confirm only from these statuses
    const allowedFrom = ["approved", "check_payment"];
    if (!allowedFrom.includes(request.requestStatus)) {
      await session.abortTransaction();
      return res.status(400).json({
        status: false,
        message: `Cannot confirm from status: ${request.requestStatus}`,
      });
    }

    const investorObj = await investorModel.findById(request.investor._id);
    if (!investorObj) {
      return res.status(404).json({
        status: false,
        message: "No user found with the ID associated with that request",
      });
    }

    // OPTIONAL: require payment
    // if (request.paymentStatus !== "paid") {
    //   await session.abortTransaction();
    //   return res.status(400).json({
    //     status: false,
    //     message: "Cannot confirm: paymentStatus is not paid",
    //   });
    // }

    const qty = Number(request.numberOfShares);
    const pps = Number(request.pricePerShare);

    if (!Number.isFinite(qty) || qty <= 0) {
      await session.abortTransaction();
      return res
        .status(400)
        .json({ status: false, message: "Invalid quantity" });
    }

    /**
     * Asset identity:
     * - assetType = request.sourceType ("InvestmentFund" | "ClientCompany")
     * - assetId   = request.source (ObjectId)
     */
    const assetType = request.sourceType;
    const assetId = request.source;

    /**
     * Your "fund case":
     * - giver is the InvestmentFund itself (holderType InvestmentFund, holderId = fundId)
     * - receiver is investors (holderType investors, holderId = request.investor)
     */
    const giverHolderType = "InvestmentFund";
    const giverHolderId = assetId;

    const receiverHolderType = "investors";
    const receiverHolderId = request.investor;

    /**
     * 1) Ensure holdings exist (NO $inc WITH $setOnInsert in the same op on same field)
     *    This prevents: "Updating the path 'shares' would create a conflict at 'shares'"
     */
    await sharesHolderModel.updateOne(
      {
        holderType: giverHolderType,
        holderId: giverHolderId,
        assetType,
        assetId,
      },
      { $setOnInsert: { shares: 0 } },
      { upsert: true, session },
    );

    await sharesHolderModel.updateOne(
      {
        holderType: receiverHolderType,
        holderId: receiverHolderId,
        assetType,
        assetId,
      },
      { $setOnInsert: { shares: 0 } },
      { upsert: true, session },
    );

    /**
     * 2) Atomic guarded decrement for giver:
     *    This is the safest pattern:
     *    - only decrements if shares >= qty
     *    - if matchedCount = 0 -> insufficient
     */
    const decRes = await sharesHolderModel.updateOne(
      {
        holderType: giverHolderType,
        holderId: giverHolderId,
        assetType,
        assetId,
        shares: { $gte: qty },
      },
      { $inc: { shares: -qty } },
      { session },
    );

    if (decRes.matchedCount === 0) {
      // Fetch current shares for better message
      const giver = await sharesHolderModel
        .findOne(
          {
            holderType: giverHolderType,
            holderId: giverHolderId,
            assetType,
            assetId,
          },
          { shares: 1 },
        )
        .session(session);

      await session.abortTransaction();
      return res.status(400).json({
        status: false,
        message: `Insufficient shares. Available: ${
          giver?.shares ?? 0
        }, requested: ${qty}`,
      });
    }

    /**
     * 3) Increment receiver
     */
    await sharesHolderModel.updateOne(
      {
        holderType: receiverHolderType,
        holderId: receiverHolderId,
        assetType,
        assetId,
      },
      { $inc: { shares: qty } },
      { session },
    );

    /**
     * 4) Create 2 transactions
     */
    const txDocs = await shareTransactionModel.create(
      [
        {
          holderType: giverHolderType,
          holderId: giverHolderId,
          assetType,
          assetId,
          type: "TRANSFER",
          side: "sell",
          quantity: qty,
          pricePerShare: pps,
          tradeRequestId: request._id,
          note: "Confirmed trade - fund sold shares",
        },
        {
          holderType: receiverHolderType,
          holderId: receiverHolderId,
          assetType,
          assetId,
          type: "TRANSFER",
          side: "buy",
          quantity: qty,
          pricePerShare: pps,
          tradeRequestId: request._id,
          note: "Confirmed trade - investor bought shares",
        },
      ],
      { session },
    );

    const sellTx = txDocs[0];
    const buyTx = txDocs[1];

    /**
     * 5) Update request status
     */
    const previousStatus = request.requestStatus;
    request.requestStatus = "confirmed";
    await request.save({ session });

    /**
     * 6) Log
     * NOTE: performedByType must match your enum/refPath:
     * - If employee confirms: performedByType should be "Employee"
     * - If investor confirms: performedByType should be "investors"
     */
    await shareTradeRequestLogModel.create(
      [
        {
          tradeRequest: request._id,
          action: "confirmed",
          performedBy: performedByUserId,
          performedByType: "Employee",
          previousStatus,
          newStatus: "confirmed",
          note: req.body.note || "",
        },
      ],
      { session },
    );

    await createNotification({
      user: investorObj.authUserId,
      type: "success",
      title: "SHARES_REQUEST_CONFIRMED",
      message: "SHARES_REQUEST_CONFIRM_MSG",
      meta: {
        tradeId: request._id,
        reason: request.rejectionReason ?? "",
        previousStatus: previousStatus,
        newStatus: request.requestStatus,
      },
    });

    await session.commitTransaction();

    return res.status(200).json({
      status: true,
      message: "Confirmed and transferred successfully",
      data: request,
      transactions: { sellTx, buyTx },
    });
  } catch (err) {
    await session.abortTransaction();
    return res.status(500).json({
      status: false,
      message: err?.message || "Confirmation failed",
    });
  } finally {
    session.endSession();
  }
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
