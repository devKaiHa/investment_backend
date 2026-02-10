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
  allowAnyAuthenticated,
} = require("../../middlewares/protectAuth");

const investmentFundRoute = express.Router();
investmentFundRoute.use(protectAuth);

investmentFundRoute
  .route("/")
  .post(requireEmployee, uploadFundLogo, processFundLogo, createInvestmentFund)
  .get(allowAnyAuthenticated, getAllInvestmentFunds);

investmentFundRoute
  .route("/:id")
  .get(allowAnyAuthenticated, getOneInvestmentFund)
  .put(requireEmployee, authService.protect, updateInvestmentFund);

module.exports = investmentFundRoute;
