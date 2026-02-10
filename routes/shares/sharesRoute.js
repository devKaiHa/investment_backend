const express = require("express");
const {
  getSharesHoldings,
  getHolderPortfolioSummary,
} = require("../../services/shares/shareHoldingService");
const {
  getShareTransactions,
} = require("../../services/shares/shareTransactionService");
const {
  protectAuth,
  allowInvestorOrEmployee,
  requireEmployee,
} = require("../../middlewares/protectAuth");

const sharesRoute = express.Router();
sharesRoute.use(protectAuth);

sharesRoute
  .route("/transactions")
  .get(allowInvestorOrEmployee, getShareTransactions);
sharesRoute.route("/holding").get(requireEmployee, getSharesHoldings);
sharesRoute
  .route("/sharesSummary")
  .get(allowInvestorOrEmployee, getHolderPortfolioSummary);

module.exports = sharesRoute;
