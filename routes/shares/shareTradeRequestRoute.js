const express = require("express");
const {
  createTradeRequest,
  getAllTradeRequests,
  getInvestorTradeRequests,
  getTradeRequestById,
  updateTradeRequest,
  deleteTradeRequest,
  confirmTradeRequest,
  uploadPaymentDoc,
  uploadPaymentConfirmation,
} = require("../../services/shares/shareTradeRequestService");
const {
  processPaymentConfirmation,
} = require("../../middlewares/uploadPaymentDocMiddleware");
const {
  protectAuth,
  requireInvestor,
  allowInvestorOrEmployee,
  requireEmployee,
} = require("../../middlewares/protectAuth");

const shareTradeRequestRoute = express.Router();
shareTradeRequestRoute.use(protectAuth);

shareTradeRequestRoute
  .route("/")
  .post(requireInvestor, createTradeRequest)
  .get(allowInvestorOrEmployee, getAllTradeRequests);

shareTradeRequestRoute
  .route("/investor/:id")
  .get(allowInvestorOrEmployee, getInvestorTradeRequests);
shareTradeRequestRoute
  .route("/:id")
  .get(allowInvestorOrEmployee, getTradeRequestById)
  .put(allowInvestorOrEmployee, updateTradeRequest)
  .delete(requireEmployee, deleteTradeRequest);
shareTradeRequestRoute
  .route("/:id/payment-doc")
  .patch(
    requireInvestor,
    uploadPaymentConfirmation,
    processPaymentConfirmation,
    uploadPaymentDoc,
  );
shareTradeRequestRoute
  .route("/confirm/:id")
  .post(requireEmployee, confirmTradeRequest);

module.exports = shareTradeRequestRoute;
