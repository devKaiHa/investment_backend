const express = require("express");

const authService = require("../../services/auth/authService");
const {
  createInvestmentFund,
  getAllInvestmentFunds,
  getOneInvestmentFund,
  updateInvestmentFund,
  processFundLogo,
  uploadFundLogo,
} = require("../../services/InvestmentsEntity/investmentFundServices");
const {
  protectAuth,
  requireEmployee,
  allowInvestorOrEmployee,
} = require("../../middlewares/protectAuth");

const investmentFundRoute = express.Router();
investmentFundRoute.use(protectAuth);

investmentFundRoute
  .route("/")
  .post(requireEmployee, uploadFundLogo, processFundLogo, createInvestmentFund)
  .get(allowInvestorOrEmployee, getAllInvestmentFunds);

investmentFundRoute
  .route("/:id")
  .get(allowInvestorOrEmployee, getOneInvestmentFund)
  .put(requireEmployee, authService.protect, updateInvestmentFund);

module.exports = investmentFundRoute;
