const express = require("express");
const {
  createCompanyInfo,
  uploadCompanyLogo,
  resizerLogo,
  getCompanyInfo,
  updataCompanyInfo,
  updateCompanyBank,
  deleteCompanyBank,
  addCompanyBankQR,
} = require("../services/companyInfoService");

const authService = require("../services/auth/authService");
const {
  uploadInvestmentCompaniesImages,
  resizeInvestmentCompaniesImages,
} = require("../services/investmentCompaniesService");

const companyInfoRoute = express.Router();

companyInfoRoute
  .route("/")
  .post(uploadCompanyLogo, resizerLogo, createCompanyInfo)
  .get(getCompanyInfo);
companyInfoRoute
  .route("/:id")
  .put(authService.protect, uploadCompanyLogo, resizerLogo, updataCompanyInfo);

companyInfoRoute
  .route("/:id/bank-qr/:bankQRId")
  .put(
    uploadInvestmentCompaniesImages,
    resizeInvestmentCompaniesImages,
    updateCompanyBank
  )
  .delete(deleteCompanyBank);

companyInfoRoute
  .route("/:id/bank-qr")
  .post(
    uploadInvestmentCompaniesImages,
    resizeInvestmentCompaniesImages,
    addCompanyBankQR
  );
module.exports = companyInfoRoute;
