const bcrypt = require("bcryptjs");
const asyncHandler = require("express-async-handler");
const employeeModel = require("../models/employeeModel");

// @desc Get list of employees
// @rout GET /api/employee
// @access Private
exports.getAllEmployees = asyncHandler(async (req, res) => {
  const pageSize = parseInt(req.query.limit) || 10;
  const page = parseInt(req.query.page) || 1;
  const skip = (page - 1) * pageSize;
  let query = {};
  if (req.query.keyword) {
    query.$or = [
      { email: { $regex: req.query.keyword, $options: "i" } },
      { name: { $regex: req.query.keyword, $options: "i" } },
    ];
  }
  const totalItems = await employeeModel.countDocuments(query);

  const totalPages = Math.ceil(totalItems / pageSize);
  const employees = await employeeModel
    .find(query)
    .skip(skip)
    .limit(pageSize)
    .sort({ createdAt: -1 })
    .populate("role", "name");

  res.status(200).json({
    status: true,
    Pages: totalPages,
    results: totalItems,
    data: employees,
  });
});

// @desc Create specific employee
// @rout POST /api/employee
// @access Private
exports.createEmployee = asyncHandler(async (req, res, next) => {
  const { email } = req.body;

  const findEmployee = await employeeModel.findOne({ email });

  if (findEmployee) {
    return res.status(400).json({
      status: "false",
      message: "This user is already registered",
    });
  }

  req.body.password = await bcrypt.hash(req.body.password, 12);

  const employee = await employeeModel.create(req.body);

  res.status(201).json({
    status: true,
    data: employee,
  });
});

// @desc Get specific Employee by ID
// @rout GET /api/employee/:id
// @access Private
exports.getOneEmployee = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({
      status: "false",
      message: "Employee ID is missing",
    });
  }

  const employee = await employeeModel.findById(id);

  if (!employee) {
    return res.status(404).json({
      status: "false",
      message: "Employee not found",
    });
  }

  res.status(200).json({
    status: true,
    data: employee,
  });
});

// @desc Update employee password by ID
// @rout PUT /api/update-employee-password
// @access Private
exports.updateEmployeePassword = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { password } = req.body;

  const employee = await employeeModel.findById(id).select("+password");

  if (!employee) {
    return res.status(404).json({
      status: "false",
      message: "Employee not found",
    });
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  employee.password = hashedPassword;
  employee.passwordChangedAt = Date.now();

  await employee.save();

  res.status(200).json({
    status: true,
    message: "Password updated successfully",
  });
});

// @desc Update employee
// @rout PUT /api/employee
// @access Private
exports.updateEmployee = asyncHandler(async (req, res, next) => {
  const id = req.params.id;
  const { email, name, role } = req.body;

  if (req.body.password) {
    return res.status(400).json({
      status: false,
      message: "Password cannot be updated here",
    });
  }

  if (!id) {
    return res.status(400).json({
      status: "false",
      message: "User ID is required",
    });
  }

  const employee = await employeeModel.findByIdAndUpdate(
    id,
    { name, email, role },
    {
      new: true,
    },
  );

  if (!employee) {
    return res.status(404).json({
      status: "false",
      message: "Employee not found",
    });
  }

  res.status(200).json({ status: true, data: employee });
});

// @desc Delete specific employee
// @rout DELETE /api/employee/:id
// @access Private
exports.deactivateEmployee = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({
      status: "false",
      message: "Employee ID is missing",
    });
  }

  const employee = await employeeModel.findOneAndUpdate(
    id,
    { active: false },
    { new: true },
  );

  if (!employee) {
    return res.status(404).json({
      status: "false",
      message: "Employee not found",
    });
  }

  res.status(200).json({ status: true, message: "Employee Deactivated" });
});
