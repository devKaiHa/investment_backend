const express = require("express");
const {
  createCompanyInfo,
  uploadCompanyLogo,
  resizerLogo,
  getCompanyInfo,
  updataCompanyInfo,
  deleteCompanyPaymentMethod,
  updateCompanyPaymentMethod,
  addCompanyPaymentMethod,
  uploadPaymentMethodImages,
  resizePaymentMethodImages,
} = require("../services/companyInfoService");

const authService = require("../services/auth/authService");
const { protectAuth, requireEmployee } = require("../middlewares/protectAuth");
const companyInfoRoute = express.Router();
companyInfoRoute.use(protectAuth, requireEmployee);

companyInfoRoute
  .route("/")
  .post(uploadCompanyLogo, resizerLogo, createCompanyInfo)
  .get(getCompanyInfo);
companyInfoRoute
  .route("/:id")
  .put(authService.protect, uploadCompanyLogo, resizerLogo, updataCompanyInfo);

companyInfoRoute
  .route("/:id/payment-method")
  .post(
    uploadPaymentMethodImages,
    resizePaymentMethodImages,
    addCompanyPaymentMethod,
  );

companyInfoRoute
  .route("/:id/payment-method/:paymentMethodId")
  .put(
    uploadPaymentMethodImages,
    resizePaymentMethodImages,
    updateCompanyPaymentMethod,
  )
  .delete(deleteCompanyPaymentMethod);

module.exports = companyInfoRoute;
