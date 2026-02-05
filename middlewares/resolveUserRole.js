const asyncHandler = require("express-async-handler");
const Investor = require("../models/investorModel");
const Applicant = require("../models/onbording/applicantModel");
const ApiError = require("../utils/apiError");

exports.resolveUserRole = asyncHandler(async (req, res) => {
  const { authUserId } = req.params;

  // 1) Check investor first
  const investor = await Investor.findOne({ authUserId });
  if (investor) {
    return res.status(200).json({
      status: true,
      role: "investor",
      profileId: investor._id,
    });
  }

  // 2) Otherwise applicant
  const applicant = await Applicant.findOne({ authUserId });
  if (applicant) {
    return res.status(200).json({
      status: true,
      role: "applicant",
      profileId: applicant._id,
      reviewStatus: applicant.reviewStatus,
    });
  }

  // 3) Neither exists
  throw new ApiError("User profile not found", 404);
});
