const express = require("express");
const {
  getOneRole,
  createRole,
  getAllRoles,
  updateRole,
  deleteRole,
} = require("../services/roleServices");
const { protectAuth, requireEmployee } = require("../middlewares/protectAuth");

const roleRoute = express.Router();
roleRoute.use(protectAuth, requireEmployee);

roleRoute.route("/").get(getAllRoles).post(createRole);

roleRoute.route("/:id").get(getOneRole).put(updateRole).delete(deleteRole);

module.exports = roleRoute;
