const express = require("express");
const { protectAuth, requireEmployee } = require("../middlewares/protectAuth");
const {
  getAllEmployees,
  createEmployee,
  updateEmployee,
  deactivateEmployee,
  getOneEmployee,
  updateEmployeePassword,
} = require("../services/employeeServices");

const employeeRoute = express.Router();
employeeRoute.use(protectAuth, requireEmployee);

employeeRoute.route("/").get(getAllEmployees).post(createEmployee);

employeeRoute.route("/:id/password").put(updateEmployeePassword);

employeeRoute
  .route("/:id")
  .get(getOneEmployee)
  .delete(deactivateEmployee)
  .put(updateEmployee);

module.exports = employeeRoute;
