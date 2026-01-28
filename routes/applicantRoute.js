const express = require("express");
const {
  updateApplicantProfile,
  updateApplicantStatus,
  getAllApplicants,
  getOneApplicant,
} = require("../services/onbording/applicantService");

const applicantRoute = express.Router();

applicantRoute.route("/").get(getAllApplicants);
applicantRoute.route("/:id").get(getOneApplicant);
applicantRoute.route("/review/:id").patch(updateApplicantStatus);
applicantRoute.route("/profile/:id").patch(updateApplicantProfile);

module.exports = applicantRoute;
