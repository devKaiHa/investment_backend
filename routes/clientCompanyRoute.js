const express = require("express");
const {
  uploadClientCompanyFiles,
  processClientCompanyFiles,
  createClientCompany,
  getAllClientCompanies,
  getOneClientCompany,
  updateClientCompany,
  clientCompanyStatus,
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

clientCompanyRoute
  .route("/:id")
  .get(getOneClientCompany)
  .put(
    uploadClientCompanyFiles,
    processClientCompanyFiles,
    updateClientCompany
  );

clientCompanyRoute.patch("/:id/status", clientCompanyStatus);

module.exports = clientCompanyRoute;
