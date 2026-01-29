const express = require("express");

const authService = require("../../services/auth/authService");
const {
  createInvestmentFund,
  getAllInvestmentFunds,
  getOneInvestmentFund,
  updateInvestmentFund,
} = require("../../services/InvestmentsEntity/investmentFundServices");

const investmentFundRoute = express.Router();

investmentFundRoute
  .route("/")
  .post(authService.protect, createInvestmentFund)
  .get(getAllInvestmentFunds);

investmentFundRoute
  .route("/:id")
  .get(getOneInvestmentFund)
  .put(authService.protect, updateInvestmentFund);

module.exports = investmentFundRoute;
