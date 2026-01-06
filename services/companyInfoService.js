const asyncHandler = require("express-async-handler");
const CompanyInfnoModel = require("../models/companyInfoModel");
const multer = require("multer");
const ApiError = require("../utils/apiError");
const { v4: uuidv4 } = require("uuid");
const sharp = require("sharp");
const employeeModel = require("../models/employeeModel");
const multerStorage = multer.memoryStorage();
const bcrypt = require("bcryptjs");
const { default: axios } = require("axios");
const { generatePassword, sendEmail } = require("../utils/helpers");

const multerFilter = function (req, file, cb) {
  if (file.mimetype.startsWith("image")) {
    cb(null, true);
  } else {
    cb(new ApiError("Only images allowed", 400), false);
  }
};

const upload = multer({ storage: multerStorage, fileFilter: multerFilter });

exports.uploadCompanyLogo = upload.single("companyLogo");

exports.resizerLogo = asyncHandler(async (req, res, next) => {
  const filename = `company-${uuidv4()}-${Date.now()}.png`;

  if (req.file) {
    await sharp(req.file.buffer)
      .toFormat("png")
      .png({ quality: 90 })
      .toFile(`uploads/companyinfo/${filename}`);
    req.body.companyLogo = filename;
  }

  next();
});

//@desc Create company info
//@route POST /api/companyinfo
exports.createCompanyInfo = asyncHandler(async (req, res, next) => {
  //1-craet a company
  const companyInfo = await CompanyInfnoModel.create(req.body);

  req.body.name = req.body.companyName;
  req.body.company = {
    companyId: companyInfo._id,
    companyName: req.body.companyName,
  };
  const oldEmail = await employeeModel.findOne({ email: req.body.email });
  if (!oldEmail) {
    const employeePass = generatePassword();
    const hashedPassword = await bcrypt.hash(employeePass, 12);
    req.body.password = hashedPassword;
    const employee = await employeeModel.create(req.body);
    const payload = {
      email: req.body.email,
      name: req.body.companyName,
      password: employeePass,
    };
    try {
      await axios.post(
        `${process.env.JOBS_URL}api/auth/createEmployee`,
        payload
      );
    } catch (err) {
      console.error("Failed to sync employee:", err.message);
    }

    await sendEmail({
      email: req.body.email,
      subject: "New Password",
      message: `Hello ${employee.name}, Your password is ${employeePass}`,
    });
  } else {
    await employeeModel.findOneAndUpdate(
      { email: req.body.email },
      { companyId: companyInfo._id }
    );
  }

  res.status(201).json({
    status: "true",
    message: "Company info inserted",
    data: companyInfo,
  });
});

//Get company info
//@role: who has role can Get company info
exports.getCompanyInfo = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  const companyInfos = await CompanyInfnoModel.findOne({ _id: companyId });

  res.status(200).json({ status: "true", data: companyInfos });
});

exports.updataCompanyInfo = asyncHandler(async (req, res, next) => {
  try {
    const { id } = req.params;
    const companyInfo = await CompanyInfnoModel.findByIdAndUpdate(
      { _id: id },
      req.body,
      { new: true }
    );
    if (!companyInfo) {
      return next(new ApiError(`There is no company with this id ${id}`, 404));
    } else {
      res.status(200).json({
        status: "true",
        message: "Company info updated",
        data: companyInfo,
      });
    }
  } catch (error) {
    console.log(error);
  }
});
