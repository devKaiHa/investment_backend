const investorModel = require("../models/investorModel");
const asyncHandler = require("express-async-handler");
const ApiError = require("../utils/apiError");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const AuthUser = require("../models/auth/authUserModel");
const Applicant = require("../models/onbording/applicantModel");
const AuthUserModel = require("../models/auth/authUserModel");
const { default: slugify } = require("slugify");

const SESSION_MAX_AGE = 1000 * 60 * 60 * 24;

const signToken = (user, sessionId) =>
  jwt.sign({ userId: user._id, sessionId }, process.env.JWT_SECRET_KEY);

exports.investorRegister = asyncHandler(async (req, res, next) => {
  const { phone, password, fullName } = req.body;

  const exists = await AuthUser.findOne({ phone });
  if (exists) return next(new ApiError("Phone already registered", 400));

  const hashed = await bcrypt.hash(password, 12);

  const user = await AuthUser.create({ phone, password: hashed });

  const profile = await Applicant.create({
    authUserId: user._id,
    fullName,
    slug: slugify(fullName),
    phone,
  });

  const sessionId = crypto.randomUUID();
  user.activeSessionId = sessionId;
  user.sessionStartedAt = new Date();
  await user.save();

  const token = signToken(profile, sessionId);

  res.status(201).json({ profile, user, token, role: "applicant" });
});

exports.investorLogin = asyncHandler(async (req, res, next) => {
  const { phone, password } = req.body;

  // Auth
  const authUser = await AuthUser.findOne({ phone });
  if (!authUser) return next(new ApiError("No user found", 404));

  const passMatch = await bcrypt.compare(password, authUser.password);
  if (!passMatch) return next(new ApiError("Invalid credentials", 401));

  if (authUser.activeSessionId) {
    const age = Date.now() - new Date(authUser.sessionStartedAt).getTime();
    if (age < SESSION_MAX_AGE)
      return next(new ApiError("Already logged in", 403));
  }

  // Create session
  const sessionId = crypto.randomUUID();
  authUser.activeSessionId = sessionId;
  authUser.sessionStartedAt = new Date();
  await authUser.save();

  // Load profile
  const investor = await investorModel.findOne({ authUserId: authUser._id });
  const applicant = !investor
    ? await Applicant.findOne({ authUserId: authUser._id })
    : null;

  if (!investor && !applicant) {
    return next(new ApiError("User profile not found", 500));
  }

  // Sanitize auth user
  const authUserSafe = authUser.toObject();
  delete authUserSafe.password;
  delete authUserSafe.activeSessionId;
  delete authUserSafe.sessionStartedAt;

  // Response
  res.status(200).json({
    status: true,
    token: signToken(authUser, sessionId),
    user: authUserSafe,
    profile: investor || applicant,
  });
});

exports.approveApplicant = asyncHandler(async (req, res) => {
  const applicant = await Applicant.findById(req.params.id);

  if (!applicant) return next(new ApiError("No user found", 404));

  const investor = await investorModel.create({
    authUserId: applicant.authUserId,
    fullName: applicant.fullName,
    latinName: applicant.latinName,
    slug: applicant.slug,
    email: applicant.email,
    birthDate: applicant.birthDate,
    attachments: applicant.attachments,
    profileImage: applicant.profileImage,
  });

  await Applicant.deleteOne({ _id: applicant._id });

  res.status(200).json({ message: "Approve success", data: investor });
});

exports.rejectApplicant = asyncHandler(async (req, res) => {
  const applicant = await Applicant.findById(req.params.id);

  applicant.reviewStatus = "rejected";
  applicant.rejectionReason = req.body.rejectionReason;
  await applicant.save();

  res.status(200).json({ message: "Reject success" });
});

exports.protectInvestor = asyncHandler(async (req, res, next) => {
  const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
  const user = await AuthUser.findById(decoded.userId);

  const investor = await investorModel.findOne({ authUserId: user._id });
  if (!investor) return next(new ApiError("Not investor", 403));

  if (!user || !user.activeSessionId || !user.sessionStartedAt) {
    return next(new ApiError("Session expired. Please log in again.", 401));
  }

  // AUTO-EXPIRE CHECK
  const sessionAge = Date.now() - new Date(user.sessionStartedAt).getTime();

  if (sessionAge > SESSION_MAX_AGE) {
    user.activeSessionId = null;
    user.sessionStartedAt = null;
    await user.save();

    return next(new ApiError("Session expired. Please log in again.", 401));
  }

  // SESSION MATCH CHECK
  if (user.activeSessionId !== decoded.sessionId) {
    return next(new ApiError("Session expired. Please log in again.", 401));
  }

  req.user = user;
  req.investor = investor;
  next();
});

exports.investorLogout = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!id) {
    res.status(500).json({ message: "ID is required" });
  }

  const authUser = await AuthUserModel.findById(id);
  if (authUser) {
    authUser.activeSessionId = null;
    authUser.sessionStartedAt = null;
    await authUser.save();
  }

  res.status(200).json({ message: "Logged out successfully" });
});
