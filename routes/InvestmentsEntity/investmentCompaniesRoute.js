const express = require("express");
const {
  createInvestmentCompanies,
  getAllInvestmentCompaniess,
  getOneInvestmentCompanies,
  updateInvestmentCompanies,
  deleteInvestmentCompanies,
  resizeInvestmentCompaniesImages,
  uploadInvestmentCompaniesImage,
  uploadInvestmentCompaniesImages,
  deleteCompanyBank,
  updateCompanyBank,
} = require("../../services/investmentCompaniesService");
const {
  protectAuth,
  requireEmployee,
  allowInvestorOrEmployee,
} = require("../../middlewares/protectAuth");

const investmentCompaniesRoute = express.Router();
investmentCompaniesRoute.use(protectAuth);

investmentCompaniesRoute
  .route("/")
  .post(
    requireEmployee,
    uploadInvestmentCompaniesImage,
    resizeInvestmentCompaniesImages,
    createInvestmentCompanies,
  )
  .get(allowInvestorOrEmployee, getAllInvestmentCompaniess);

investmentCompaniesRoute
  .route("/:id/bank-qr/:bankQRId")
  .put(
    requireEmployee,
    uploadInvestmentCompaniesImages,
    resizeInvestmentCompaniesImages,
    updateCompanyBank,
  )
  .delete(requireEmployee, deleteCompanyBank);

investmentCompaniesRoute
  .route("/:id")
  .put(
    requireEmployee,
    uploadInvestmentCompaniesImages,
    resizeInvestmentCompaniesImages,
    updateInvestmentCompanies,
  )
  .get(allowInvestorOrEmployee, getOneInvestmentCompanies)
  .delete(requireEmployee, deleteInvestmentCompanies);

module.exports = investmentCompaniesRoute;
