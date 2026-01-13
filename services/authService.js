const asyncHandler = require("express-async-handler");
const ApiError = require("../utils/apiError");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const employeeModel = require("../models/employeeModel");
const { createToken } = require("../utils/helpers");

// @desc      Login
// @route     POST /api/auth/login
// @access    Public
exports.login = asyncHandler(async (req, res, next) => {
  try {
    const user = await employeeModel
      .findOne({ email: req.body.email })
      .select("+password");

    if (!user) {
      return next(new ApiError("Incorrect email", 401));
    }

    const passwordMatch = await bcrypt.compare(
      req.body.password,
      user.password
    );
    if (!passwordMatch) {
      return next(new ApiError("Incorrect Password", 401));
    }

    if (!user.active) {
      return next(new ApiError("The account is not active", 401));
    }

    user.password = undefined;

    const token = createToken(user);
    res.status(200).json({
      status: "true",
      data: user,
      token,
    });
  } catch (error) {
    console.error("Error during login:", error);
    next(error);
  }
});

// @desc   Make sure the user is logged in sys
exports.protect = asyncHandler(async (req, res, next) => {
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return next(new ApiError("Not login", 401));
  } else {
    try {
      //2- Verify token (no change happens, expired token)
      const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);

      //3-Check if user exists

      const curentUser = await employeeModel.findOne({
        _id: decoded.userId,
      });

      if (!curentUser) {
        return next(new ApiError("The user does not exit", 404));
      }
      req.user = curentUser;
      next();
    } catch (error) {
      // Token verification failed
      console.error("JWT Error:", error.message);
      if (error.name === "TokenExpiredError") {
        return next(new ApiError("Token has expired", 401));
      } else {
        console.error("JWT Error:", error.message);
        return next(new ApiError("Not login", 401));
      }
    }
  }
});
