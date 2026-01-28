const express = require("express");
const {
  uploadClientCompanyFiles,
  processClientCompanyFiles,
  createClientCompany,
  getAllClientCompanies,
  getOneClientCompany,
  updateClientCompany,
  clientCompanyStatus,
  getAllClientRequests,
  getOneCompany,
  updateInvestInfo,
} = require("../services/clientCompanyService");
const authService = require("../services/auth/authService");

const clientCompanyRoute = express.Router();

clientCompanyRoute
  .route("/")
  .post(
    authService.protect,
    uploadClientCompanyFiles,
    processClientCompanyFiles,
    createClientCompany
  )
  .get(getAllClientCompanies);

clientCompanyRoute
  .route("/request")
  .get(authService.protect, getAllClientRequests);

clientCompanyRoute
  .route("/:id")
  .get(getOneClientCompany)
  .put(
    authService.protect,
    uploadClientCompanyFiles,
    processClientCompanyFiles,
    updateClientCompany
  );

clientCompanyRoute.route("/company/:id").get(getOneCompany);

clientCompanyRoute
  .route("/:id/status")
  .patch(authService.protect, clientCompanyStatus);
clientCompanyRoute
  .route("/:id/investInfo")
  .patch(authService.protect, updateInvestInfo);

module.exports = clientCompanyRoute;
