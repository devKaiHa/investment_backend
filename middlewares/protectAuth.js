const asyncHandler = require("express-async-handler");
const ApiError = require("../utils/apiError");
const jwt = require("jsonwebtoken");
const AuthUser = require("../models/auth/authUserModel");
const investorModel = require("../models/investorModel");
const applicantModel = require("../models/onbording/applicantModel");
const employeeModel = require("../models/employeeModel");

exports.protectAuth = asyncHandler(async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return next(new ApiError("Not authenticated", 401));
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
  } catch (err) {
    return next(new ApiError("Token expired or invalid", 401));
  }

  // Try AuthUser (investor / applicant)
  const authUser = await AuthUser.findById(decoded.userId);

  if (authUser) {
    // session validation (ONLY for auth users)
    if (!authUser.activeSessionId || !authUser.sessionStartedAt) {
      return next(new ApiError("Session expired. Please log in again.", 401));
    }

    const sessionAge =
      Date.now() - new Date(authUser.sessionStartedAt).getTime();

    if (sessionAge > process.env.SESSION_MAX_AGE) {
      authUser.activeSessionId = null;
      authUser.sessionStartedAt = null;
      await authUser.save();
      return next(new ApiError("Session expired. Please log in again.", 401));
    }

    if (authUser.activeSessionId !== decoded.sessionId) {
      return next(new ApiError("Session expired. Please log in again.", 401));
    }

    req.authUser = authUser;
    req.userType = "authUser";
    return next();
  }

  // Try Employee
  const employee = await employeeModel.findById(decoded.userId);

  if (!employee) {
    return next(new ApiError("User not found", 404));
  }

  req.employee = employee;
  req.userType = "employee";
  next();
});

exports.requireInvestor = asyncHandler(async (req, res, next) => {
  if (req.userType !== "authUser") {
    return next(new ApiError("Not investor", 403));
  }

  const investor = await investorModel.findOne({
    authUserId: req.authUser._id,
  });

  if (!investor) {
    return next(new ApiError("Not investor", 403));
  }

  req.investor = investor;
  next();
});

exports.requireApplicant = asyncHandler(async (req, res, next) => {
  if (req.userType !== "authUser") {
    return next(new ApiError("Not applicant", 403));
  }

  const applicant = await applicantModel.findOne({
    authUserId: req.authUser._id,
  });

  if (!applicant) {
    return next(new ApiError("Not applicant", 403));
  }

  req.applicant = applicant;
  next();
});

exports.requireEmployee = (req, res, next) => {
  if (req.userType !== "employee") {
    return next(new ApiError("Not employee", 403));
  }
  next();
};

exports.allowInvestorOrEmployee = asyncHandler(async (req, res, next) => {
  if (req.userType === "employee") {
    return next();
  }

  if (req.userType === "authUser") {
    const investor = await investorModel.findOne({
      authUserId: req.authUser._id,
    });

    if (!investor) {
      return next(new ApiError("Access denied", 403));
    }

    req.investor = investor;
    return next();
  }

  return next(new ApiError("Access denied", 403));
});

exports.allowAnyAuthenticated = (req, res, next) => {
  if (req.userType === "authUser" || req.userType === "employee") {
    return next();
  }

  return next(new ApiError("Not authenticated", 401));
};
