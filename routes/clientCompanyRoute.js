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
} = require("../services/clientCompanyService");

const clientCompanyRoute = express.Router();

clientCompanyRoute
  .route("/")
  .post(
    uploadClientCompanyFiles,
    processClientCompanyFiles,
    createClientCompany
  )
  .get(getAllClientCompanies);

clientCompanyRoute.route("/request").get(getAllClientRequests);

clientCompanyRoute
  .route("/:id")
  .get(getOneClientCompany)
  .put(
    uploadClientCompanyFiles,
    processClientCompanyFiles,
    updateClientCompany
  );

clientCompanyRoute.route("/company/:id").get(getOneCompany);

clientCompanyRoute.patch("/:id/status", clientCompanyStatus);

module.exports = clientCompanyRoute;
