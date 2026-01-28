const Applicant = require("../../models/onbording/applicantModel");
const asyncHandler = require("express-async-handler");
const ApiError = require("../../utils/apiError");
const multer = require("multer");
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const investorModel = require("../../models/investorModel");
const { default: mongoose } = require("mongoose");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});
exports.uploadFields = upload.fields([
  { name: "idPhoto", maxCount: 1 },
  { name: "livePhoto", maxCount: 1 },
]);
exports.processApplicantPhotos = asyncHandler(async (req, res, next) => {
  if (!req.files) return next();

  const uploadDir = "uploads/Applicants";
  await fs.promises.mkdir(uploadDir, { recursive: true });

  const processFile = async (file) => {
    if (!file.mimetype.startsWith("image/")) {
      throw new ApiError("Only images are allowed", 400);
    }

    const filename = `Applicant-${uuidv4()}.webp`;
    const uploadPath = path.join(uploadDir, filename);

    await sharp(file.buffer)
      .rotate() // auto-fix orientation (important for camera photos)
      .resize({ width: 1200, height: 1200, fit: "inside" })
      .webp({ quality: 70 })
      .toFile(uploadPath);

    return filename;
  };

  if (req.files.idPhoto?.[0]) {
    req.body.idPhoto = await processFile(req.files.idPhoto[0]);
  }

  if (req.files.livePhoto?.[0]) {
    req.body.livePhoto = await processFile(req.files.livePhoto[0]);
  }

  next();
});

exports.updateApplicantProfile = asyncHandler(async (req, res, next) => {
  const applicant = await Applicant.findOne({ authUserId: req.params.id });
  if (!applicant) return next(new ApiError("No user found", 404));

  Object.assign(applicant, req.body);

  await applicant.save();

  res.status(200).json({
    message: "Update success",
    data: applicant,
  });
});

exports.updateApplicantStatus = asyncHandler(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { reviewStatus, msg } = req.body;

    if (!["approved", "rejected"].includes(reviewStatus)) {
      await session.abortTransaction();
      return res.status(400).json({
        status: false,
        message: "Invalid status value",
      });
    }

    const applicant = await Applicant.findOne(
      { authUserId: req.params.id },
      null,
      { session },
    );

    if (!applicant) {
      await session.abortTransaction();
      return next(new ApiError("No user found", 404));
    }

    // Prevent double approval
    if (applicant.reviewStatus === "approved") {
      await session.abortTransaction();
      return next(new ApiError("Applicant already approved", 400));
    }

    // Update applicant status
    applicant.reviewStatus = reviewStatus;
    applicant.rejectionReason = reviewStatus === "approved" ? null : msg;

    await applicant.save({ session });

    // Create investor only if approved
    if (reviewStatus === "approved") {
      const applicantObj = applicant.toObject();

      const investorPayload = {
        authUserId: applicantObj.authUserId,
        fullName: applicantObj.fullName,
        latinName: applicantObj.latinName,
        slug: applicantObj.slug,
        email: applicantObj.email,
        phone: applicantObj.phone,
        birthDate: applicantObj.birthDate,
        idPhoto: applicantObj.idPhoto,
        livePhoto: applicantObj.livePhoto,
        profileImage: applicantObj.profileImage,
        nationalId: applicantObj.idNumber,
        passportId: applicantObj.passportNumber,
      };

      await investorModel.create([investorPayload], { session });
    }

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      message: "Status updated successfully",
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
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
    const applicant = await Applicant.findOne({ authUserId: req.params.id });

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
