const express = require("express");
const { resolveUserRole } = require("../../middlewares/resolveUserRole");
const { protectAuth } = require("../../middlewares/protectAuth");

const profileRoute = express.Router();

profileRoute.get("/check-role/:authUserId", protectAuth, resolveUserRole);

module.exports = profileRoute;
