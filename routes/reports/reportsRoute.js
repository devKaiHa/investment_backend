const express = require("express");
const {
  protectAuth,
  requireEmployee,
} = require("../../middlewares/protectAuth");
const {
  getFundsReport,
  getInvestorReport,
  getTopInvestorsByShares,
  getApplicantReviewReport,
  getTopApplicantCountry,
} = require("../../services/reports/reportsServices");

const reportsRoute = express.Router();
reportsRoute.use(protectAuth, requireEmployee);

reportsRoute.route("/funds").get(getFundsReport);
reportsRoute.route("/investors").get(getInvestorReport);
reportsRoute.route("/top-investors").get(getTopInvestorsByShares);
reportsRoute.route("/applicants").get(getApplicantReviewReport);
reportsRoute.route("/applicants-country").get(getTopApplicantCountry);

module.exports = reportsRoute;
