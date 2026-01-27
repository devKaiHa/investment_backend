const Applicant = require("../models/applicantModel");
const asyncHandler = require("express-async-handler");
const ApiError = require("../utils/apiError");

exports.updateApplicantProfile = asyncHandler(async (req, res) => {
  const applicant = await Applicant.findOne({ authUserId: req.user._id });

  if (!applicant) return next(new ApiError("No user found", 404));

  Object.assign(applicant, req.body);
  await applicant.save();

  res.status(200).json({ message: "Updated successfully", data: applicant });
});

exports.submitForReview = asyncHandler(async (req, res) => {
  const applicant = await Applicant.findOne({ authUserId: req.user._id });

  if (!applicant) return next(new ApiError("No user found", 404));

  applicant.reviewStatus = "pending";
  await applicant.save();

  res.status(200).json({ message: "Request sent successfully" });
});
