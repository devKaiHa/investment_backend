const express = require("express");

const authService = require("../../services/auth/authService");
const {
  getInvestmentEntityLog,
} = require("../../services/InvestmentsEntity/InvestmentsEntityLogService");

const InvestmentsEntitySharedRoute = express.Router();

InvestmentsEntitySharedRoute.route("/").get(
  authService.protect,
  getInvestmentEntityLog
);

module.exports = InvestmentsEntitySharedRoute;
