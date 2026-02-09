const express = require("express");
const {
  createInvestor,
  getAllInvestors,
  getOneInvestor,
  updateInvestor,
  deleteInvestor,
  resizeInvestorImages,
  uploadInvestorImages,
  uploadInvestorImagesDisk,
  processInvestorFiles,
  getInvestorPortfolio,
} = require("../../services/investors/investorService");
const {
  investorLogin,
  investorRegister,
  investorLogout,
  protectInvestor,
  verifyPin,
  investorLoginPinCode,
} = require("../../services/investors/investorAuthService");

const investorRoute = express.Router();

investorRoute
  .route("/")
  .post(uploadInvestorImages, resizeInvestorImages, createInvestor)
  .get(getAllInvestors);

investorRoute.route("/auth/login").post(investorLoginPinCode);
investorRoute.route("/auth/register").post(investorRegister);
investorRoute.route("/auth/logout/:id").post(investorLogout);
investorRoute.route("/auth/verify").post(verifyPin);

investorRoute
  .route("/:id")
  .put(uploadInvestorImagesDisk, processInvestorFiles, updateInvestor)
  .get(getOneInvestor)
  .delete(deleteInvestor);

investorRoute.route("/portfolio/:holderId").get(getInvestorPortfolio);

module.exports = investorRoute;
