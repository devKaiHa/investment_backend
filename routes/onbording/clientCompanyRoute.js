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
} = require("../../services/InvestmentsEntity/clientCompanyService");
const {
  protectAuth,
  requireEmployee,
} = require("../../middlewares/protectAuth");

const clientCompanyRoute = express.Router();
clientCompanyRoute.use(protectAuth);

clientCompanyRoute
  .route("/")
  .post(
    requireEmployee,
    uploadClientCompanyFiles,
    processClientCompanyFiles,
    createClientCompany,
  )
  .get(getAllClientCompanies);

clientCompanyRoute.route("/request").get(requireEmployee, getAllClientRequests);

clientCompanyRoute
  .route("/:id")
  .get(getOneClientCompany)
  .put(
    requireEmployee,
    uploadClientCompanyFiles,
    processClientCompanyFiles,
    updateClientCompany,
  );

clientCompanyRoute.route("/company/:id").get(getOneCompany);

clientCompanyRoute
  .route("/:id/status")
  .patch(requireEmployee, clientCompanyStatus);
clientCompanyRoute
  .route("/:id/investInfo")
  .patch(requireEmployee, updateInvestInfo);

module.exports = clientCompanyRoute;
