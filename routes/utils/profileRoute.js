const express = require("express");
const { resolveUserRole } = require("../../middlewares/resolveUserRole");
const authService = require("../../services/auth/authService");

const profileRoute = express.Router();

profileRoute.get("/check-role/:authUserId", resolveUserRole);

module.exports = profileRoute;
