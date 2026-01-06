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
} = require("../services/investmentCompaniesService");

const investmentCompaniesRoute = express.Router();

investmentCompaniesRoute
  .route("/")
  .post(
    uploadInvestmentCompaniesImage,
    resizeInvestmentCompaniesImages,
    createInvestmentCompanies
  )
  .get(getAllInvestmentCompaniess);

investmentCompaniesRoute
  .route("/:id/bank-qr/:bankQRId")
  .put(
    uploadInvestmentCompaniesImages,
    resizeInvestmentCompaniesImages,
    updateCompanyBank
  )
  .delete(deleteCompanyBank);

investmentCompaniesRoute
  .route("/:id")
  .put(
    uploadInvestmentCompaniesImages,
    resizeInvestmentCompaniesImages,
    updateInvestmentCompanies
  )
  .get(getOneInvestmentCompanies)
  .delete(deleteInvestmentCompanies);

module.exports = investmentCompaniesRoute;
