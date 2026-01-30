const express = require("express");

const authService = require("../../services/auth/authService");
const {
  getInvestmentEntityLog,
  getAllInvestmentEntities,
} = require("../../services/InvestmentsEntity/InvestmentsEntityService");

const InvestmentsEntitySharedRoute = express.Router();

InvestmentsEntitySharedRoute.route("/").get(
  authService.protect,
  getInvestmentEntityLog,
);

InvestmentsEntitySharedRoute.route("/entities").get(getAllInvestmentEntities);

module.exports = InvestmentsEntitySharedRoute;
