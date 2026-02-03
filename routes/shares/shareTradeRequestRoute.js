const express = require("express");
const {
  createTradeRequest,
  getAllTradeRequests,
  getInvestorTradeRequests,
  getTradeRequestById,
  updateTradeRequest,
  deleteTradeRequest,
  confirmTradeRequest,
} = require("../../services/shares/shareTradeRequestService");

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
shareTradeRequestRoute.route("/confirm/:id").post(confirmTradeRequest);

module.exports = shareTradeRequestRoute;
