const Applicant = require("../../models/onbording/applicantModel");
const asyncHandler = require("express-async-handler");
const ApiError = require("../../utils/apiError");

exports.updateApplicantProfile = asyncHandler(async (req, res, next) => {
  const applicant = await Applicant.findById(req.params.id);

  if (!applicant) return next(new ApiError("No user found", 404));

  Object.assign(applicant, req.body);
  await applicant.save();

  res.status(200).json({ message: "Updated successfully", data: applicant });
});

exports.updateApplicantStatus = asyncHandler(async (req, res, next) => {
  const applicant = await Applicant.findById(req.params.id);
  const { reviewStatus, msg } = req.body;

  if (!["approved", "rejected"].includes(reviewStatus)) {
    return res.status(400).json({
      status: false,
      message: "Invalid status value",
    });
  }

  if (!applicant) return next(new ApiError("No user found", 404));

  applicant.reviewStatus = reviewStatus;
  applicant.rejectionReason = msg;

  if (reviewStatus === "approved") applicant.rejectionReason = null;
  await applicant.save();

  res.status(200).json({ message: "Status updated successfully" });
});

exports.getAllApplicants = asyncHandler(async (req, res, next) => {
  const { keyword, page = 1, limit = 10, sort } = req.query;

  try {
    const query = {};

    // Keyword search
    if (keyword && keyword.trim() !== "") {
      query.$or = [
        { fullName: { $regex: keyword, $options: "i" } },
        { latinName: { $regex: keyword, $options: "i" } },
        { email: { $regex: keyword, $options: "i" } },
        { phone: { $regex: keyword, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;
    const sortOption = sort && sort.trim() !== "" ? sort : "-createdAt";

    const [applicants, total] = await Promise.all([
      Applicant.find(query).sort(sortOption).skip(skip).limit(Number(limit)),

      Applicant.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      status: true,
      message: "success",
      pagination: {
        totalItems: total,
        totalPages,
        currentPage: Number(page),
        itemsPerPage: Number(limit),
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
      data: applicants,
    });
  } catch (error) {
    console.error(`Error while fetching applicants data: ${error.message}`);
    res.status(500).json({
      status: false,
      message: error.message,
    });
  }
});

exports.getOneApplicant = asyncHandler(async (req, res, next) => {
  try {
    const applicant = await Applicant.findById(req.params.id);

    if (!applicant) {
      return res.status(404).json({
        status: false,
        message: "Applicant not found",
      });
    }

    res.status(200).json({
      status: true,
      message: "success",
      data: applicant,
    });
  } catch (error) {
    console.error(`Error fetching applicant: ${error.message}`);
    return res.status(500).json({
      status: false,
      message: error.message,
    });
  }
});
