const express = require("express");
const {
  getSharesHoldings,
  getHolderPortfolioSummary,
} = require("../../services/shares/shareHoldingService");
const {
  getShareTransactions,
} = require("../../services/shares/shareTransactionService");

const sharesRoute = express.Router();

sharesRoute.route("/transactions").get(getShareTransactions);
sharesRoute.route("/holding").get(getSharesHoldings);
sharesRoute.route("/sharesSummary").get(getHolderPortfolioSummary);

module.exports = sharesRoute;
