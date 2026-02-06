const express = require("express");
const {
  getOneRole,
  createRole,
  getAllRoles,
  updateRole,
  deleteRole,
} = require("../services/roleServices");

const authService = require("../services/auth/authService");

const roleRoute = express.Router();

roleRoute
  .route("/")
  .get(authService.protect, getAllRoles)
  .post(authService.protect, createRole);

roleRoute
  .route("/:id")
  .get(authService.protect, getOneRole)
  .put(authService.protect, updateRole)
  .delete(authService.protect, deleteRole);

module.exports = roleRoute;
