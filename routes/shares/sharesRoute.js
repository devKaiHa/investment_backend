const express = require("express");
const {
  getSharesHoldings,
  getHolderPortfolioSummary,
} = require("../../services/shares/shareHoldingService");

const sharesHoldingRoute = express.Router();

sharesHoldingRoute.route("/").get(getSharesHoldings);
sharesHoldingRoute.route("/sharesSummary").get(getHolderPortfolioSummary);

module.exports = sharesHoldingRoute;
