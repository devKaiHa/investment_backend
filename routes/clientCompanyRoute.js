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
const authService = require("../services/authService");

const clientCompanyRoute = express.Router();

clientCompanyRoute.use(authService.protect);
clientCompanyRoute
  .route("/")
  .post(
    uploadClientCompanyFiles,
    processClientCompanyFiles,
    createClientCompany,
  )
  .get(getAllClientCompanies);

clientCompanyRoute.route("/request").get(getAllClientRequests);

clientCompanyRoute
  .route("/:id")
  .get(getOneClientCompany)
  .put(
    uploadClientCompanyFiles,
    processClientCompanyFiles,
    updateClientCompany,
  );

clientCompanyRoute.route("/company/:id").get(getOneCompany);

clientCompanyRoute.patch("/:id/status", clientCompanyStatus);
clientCompanyRoute.patch("/:id/investInfo", updateInvestInfo);

module.exports = clientCompanyRoute;
