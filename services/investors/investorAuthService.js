const investorModel = require("../../models/investorModel");
const asyncHandler = require("express-async-handler");

const bcrypt = require("bcrypt");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const AuthUser = require("../../models/auth/authUserModel");
const Applicant = require("../../models/onbording/applicantModel");
const AuthUserModel = require("../../models/auth/authUserModel");
const { default: slugify } = require("slugify");
const ApiError = require("../../utils/apiError");

const SESSION_MAX_AGE = 1000 * 60 * 60 * 24;

const signToken = (user, sessionId) =>
  jwt.sign(
    {
      userId: user._id,
      sessionId,
      permission: user.isInvestor ? "investor" : "applicant",
    },
    process.env.JWT_SECRET_KEY,
    { expiresIn: 1 },
  );

exports.investorRegister = asyncHandler(async (req, res, next) => {
  const { phone, password, fullName, pinCode } = req.body;

  const exists = await AuthUser.findOne({ phone });
  if (exists) return next(new ApiError("Phone already registered", 400));

  const hashed = await bcrypt.hash(password, 12);
  const hashedPin = await bcrypt.hash(pinCode, 12);

  const user = await AuthUser.create({
    phone,
    password: hashed,
    pinCode: hashedPin,
  });

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

exports.investorLoginPinCode = asyncHandler(async (req, res, next) => {
  const { phone, pinCode } = req.body;

  // Auth
  const authUser = await AuthUser.findOne({ phone }).select("+pinCode");
  if (!authUser) return next(new ApiError("No user found", 404));

  const passMatch = await bcrypt.compare(pinCode, authUser.pinCode);
  if (!passMatch) return next(new ApiError("Invalid credentials", 401));

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

// User login with password
exports.investorLogin = asyncHandler(async (req, res, next) => {
  const { phone, password } = req.body;

  const authUser = await AuthUser.findOne({ phone });
  if (!authUser) return next(new ApiError("No user found", 404));

  const passMatch = await bcrypt.compare(password, authUser.password);
  if (!passMatch) return next(new ApiError("Invalid credentials", 401));

  // if (authUser.activeSessionId) {
  //   const age = Date.now() - new Date(authUser.sessionStartedAt).getTime();
  //   if (age < SESSION_MAX_AGE)
  //     return next(new ApiError("Already logged in", 403));
  // }

  const investor = await investorModel.findOne({ authUserId: authUser._id });
  const applicant = !investor
    ? await Applicant.findOne({ authUserId: authUser._id })
    : null;

  if (!investor && !applicant) {
    return next(new ApiError("User profile not found", 500));
  }

  // APPLICANT
  if (!investor) {
    const sessionId = crypto.randomUUID();
    authUser.activeSessionId = sessionId;
    authUser.sessionStartedAt = new Date();
    await authUser.save();

    return res.status(200).json({
      status: true,
      token: signToken(authUser, sessionId),
      profile: applicant,
      requiresPin: false,
    });
  }

  // INVESTOR
  const challengeId = crypto.randomUUID();
  authUser.loginChallengeId = challengeId;
  authUser.challengeCreatedAt = new Date();
  await authUser.save();

  res.status(200).json({
    status: true,
    requiresPin: true,
    challengeId,
    userId: authUser._id,
  });
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
    authUser.pinVerifiedAt = null;
    await authUser.save();
  }

  res.status(200).json({ message: "Logged out successfully" });
});

exports.verifyPin = asyncHandler(async (req, res, next) => {
  const { userId, pin, challengeId } = req.body;

  const authUser = await AuthUser.findById(userId).select("+pinCode");
  if (!authUser) return next(new ApiError("User not found", 404));

  if (authUser.loginChallengeId !== challengeId) {
    return next(new ApiError("Invalid login challenge", 401));
  }

  const age = Date.now() - new Date(authUser.challengeCreatedAt).getTime();
  if (age > 5 * 60 * 1000) {
    return next(new ApiError("Login challenge expired", 401));
  }

  const isValid = await bcrypt.compare(pin, authUser.pinCode);
  if (!isValid) return next(new ApiError("Invalid PIN", 401));

  // Create session
  const sessionId = crypto.randomUUID();
  authUser.activeSessionId = sessionId;
  authUser.sessionStartedAt = new Date();
  authUser.loginChallengeId = null;
  authUser.challengeCreatedAt = null;
  await authUser.save();

  const investor = await investorModel.findOne({
    authUserId: authUser._id,
  });

  res.status(200).json({
    token: signToken(authUser, sessionId),
    profile: investor,
  });
});
