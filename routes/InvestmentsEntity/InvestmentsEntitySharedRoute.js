const express = require("express");

const {
  getInvestmentEntityLog,
  getAllInvestmentEntities,
} = require("../../services/InvestmentsEntity/InvestmentsEntityService");
const {
  requireEmployee,
  protectAuth,
  allowAnyAuthenticated,
} = require("../../middlewares/protectAuth");

const InvestmentsEntitySharedRoute = express.Router();

InvestmentsEntitySharedRoute.use(protectAuth);
InvestmentsEntitySharedRoute.route("/").get(
  requireEmployee,
  getInvestmentEntityLog,
);

InvestmentsEntitySharedRoute.route("/entities").get(
  allowAnyAuthenticated,
  getAllInvestmentEntities,
);

module.exports = InvestmentsEntitySharedRoute;
