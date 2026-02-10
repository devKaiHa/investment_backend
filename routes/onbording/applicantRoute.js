const express = require("express");
const {
  updateApplicantProfile,
  updateApplicantStatus,
  getAllApplicants,
  getOneApplicant,
  uploadFields,
  processApplicantPhotos,
} = require("../../services/onbording/applicantService");
const {
  protectAuth,
  requireEmployee,
  requireApplicant,
} = require("../../middlewares/protectAuth");

const applicantRoute = express.Router();
applicantRoute.use(protectAuth);

applicantRoute.route("/").get(requireEmployee, getAllApplicants);
applicantRoute.route("/:id").get(getOneApplicant);
applicantRoute.route("/review/:id").patch(updateApplicantStatus);
applicantRoute
  .route("/profile/:id")
  .put(
    requireApplicant,
    uploadFields,
    processApplicantPhotos,
    updateApplicantProfile,
  );

module.exports = applicantRoute;
