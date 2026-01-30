const express = require("express");
const {
  createTradeRequest,
  getAllTradeRequests,
  getInvestorTradeRequests,
  getTradeRequestById,
  updateTradeRequest,
  deleteTradeRequest,
} = require("../../services/shares/sharePurchaseRequestService");

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

module.exports = shareTradeRequestRoute;
