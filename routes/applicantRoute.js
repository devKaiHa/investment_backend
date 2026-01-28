const express = require("express");
const {
  updateApplicantProfile,
  updateApplicantStatus,
  getAllApplicants,
  getOneApplicant,
  uploadFields,
  processApplicantPhotos,
} = require("../services/onbording/applicantService");

const applicantRoute = express.Router();

applicantRoute.route("/").get(getAllApplicants);
applicantRoute.route("/:id").get(getOneApplicant);
applicantRoute.route("/review/:id").patch(updateApplicantStatus);
applicantRoute
  .route("/profile/:id")
  .put(uploadFields, processApplicantPhotos, updateApplicantProfile);

module.exports = applicantRoute;
