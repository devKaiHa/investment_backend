const express = require("express");
const {
  updateApplicantProfile,
  submitForReview,
  getAllApplicants,
  getOneApplicant,
} = require("../services/applicantService");

const applicantRoute = express.Router();

applicantRoute.route("/").get(getAllApplicants);
applicantRoute.route("/:id").get(getOneApplicant);
applicantRoute.route("/review/:id").patch(submitForReview);
applicantRoute.route("/profile/:id").patch(updateApplicantProfile);

module.exports = applicantRoute;
