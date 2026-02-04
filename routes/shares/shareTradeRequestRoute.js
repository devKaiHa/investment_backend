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

const shareTradeRequestRoute = express.Router();
shareTradeRequestRoute
  .route("/")
  .post(createTradeRequest)
  .get(getAllTradeRequests);

shareTradeRequestRoute.route("/investor/:id").get(getInvestorTradeRequests);
shareTradeRequestRoute
  .route("/:id")
  .get(getTradeRequestById)
  .put(updateTradeRequest)
  .delete(deleteTradeRequest);
shareTradeRequestRoute
  .route("/:id/payment-doc")
  .patch(
    uploadPaymentConfirmation,
    processPaymentConfirmation,
    uploadPaymentDoc,
  );
shareTradeRequestRoute.route("/confirm/:id").post(confirmTradeRequest);

module.exports = shareTradeRequestRoute;
