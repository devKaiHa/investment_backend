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
  verifyPin,
  investorLoginPinCode,
} = require("../../services/investors/investorAuthService");
const {
  protectAuth,
  requireEmployee,
  requireInvestor,
  allowInvestorOrEmployee,
} = require("../../middlewares/protectAuth");

const investorRoute = express.Router();

investorRoute
  .route("/")
  .post(
    protectAuth,
    requireEmployee,
    uploadInvestorImages,
    resizeInvestorImages,
    createInvestor,
  )
  .get(protectAuth, requireEmployee, getAllInvestors);

investorRoute.route("/auth/login").post(investorLoginPinCode);
investorRoute.route("/auth/register").post(investorRegister);
investorRoute.route("/auth/logout/:id").post(requireInvestor, investorLogout);
investorRoute.route("/auth/verify").post(verifyPin);

investorRoute
  .route("/:id")
  .put(
    protectAuth,
    requireInvestor,
    uploadInvestorImagesDisk,
    processInvestorFiles,
    updateInvestor,
  )
  .get(protectAuth, allowInvestorOrEmployee, getOneInvestor)
  .delete(protectAuth, requireEmployee, deleteInvestor);

investorRoute
  .route("/portfolio/:holderId")
  .get(protectAuth, allowInvestorOrEmployee, getInvestorPortfolio);

module.exports = investorRoute;
