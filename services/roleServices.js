const asyncHandler = require("express-async-handler");
const rolesModel = require("../models/roleModel");
const { default: mongoose } = require("mongoose");

/**
 * @desc Get all roles
 * @route GET  /api/role
 * @accsess Private
 */
exports.getAllRoles = asyncHandler(async (req, res) => {
  const role = await rolesModel.find();
  res.status(200).json({ status: "true", data: role });
});

/**
 * @desc Create role
 * @route POST /api/role
 * @access Private
 */
exports.createRole = asyncHandler(async (req, res) => {
  const { name, description, roles } = req.body;

  const role = await rolesModel.create({
    name,
    description,
    roles,
  });

  res
    .status(201)
    .json({ status: "true", message: "Role Inserted", data: role });
});

/**
 * @desc Get specific role by id
 * @route GET /api/role/:id
 * @access Private
 */
exports.getOneRole = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      status: "false",
      message: `Invalid role ID`,
    });
  }

  const role = await rolesModel.findById(id);

  if (!role) {
    return res.status(404).json({
      status: "false",
      message: `No role found for the ID ${id}`,
    });
  }

  res.status(200).json({ status: "true", data: role });
});

/**
 * @desc Update specific role by id
 * @route PUT /api/role/:id
 * @access Private
 */
exports.updateRole = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      status: "false",
      message: `Invalid role ID to update`,
    });
  }

  const role = await rolesModel.findByIdAndUpdate(id, req.body, { new: true });

  if (!role) {
    return res.status(404).json({
      status: "false",
      message: `No role found for the ID ${id}`,
    });
  }
  res.status(200).json({ status: "true", message: "Role updated", data: role });
});

/**
 * @desc Delete specific Role
 * @route DELETE /api/role/:id
 * @access priveta
 */
exports.deleteRole = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      status: "false",
      message: `Invalid role ID to delete`,
    });
  }

  const role = await rolesModel.findByIdAndDelete(id);
  if (!role) {
    return res.status(404).json({
      status: "false",
      message: `No role found for the ID ${id}`,
    });
  }

  res.status(200).json({ status: "true", message: "Role Deleted" });
});
