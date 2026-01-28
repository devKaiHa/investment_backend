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
const mongoose = require("mongoose");

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

exports.deleteCompanyBank = asyncHandler(async (req, res) => {
  const { id, bankQRId } = req.params;

  if (!bankQRId) {
    return res.status(400).json({
      status: false,
      message: "companyId and bankQRId are required",
    });
  }

  const updatedCompany = await CompanyInfnoModel.findOneAndUpdate(
    { _id: id },
    {
      $pull: {
        bankQR: { _id: new mongoose.Types.ObjectId(bankQRId) },
      },
    },
    { new: true }
  );

  if (!updatedCompany) {
    return res.status(404).json({
      status: false,
      message: "Investment company or Bank QR not found",
    });
  }

  res.status(200).json({
    status: true,
    message: "Bank QR deleted successfully",
  });
});

exports.updateCompanyBank = asyncHandler(async (req, res) => {
  const { id, bankQRId } = req.params;
  const { companyId } = req.query;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  const update = {};

  if (req.body.name !== undefined) update["bankQR.$.name"] = req.body.name;

  if (req.body.accountNumber !== undefined)
    update["bankQR.$.accountNumber"] = req.body.accountNumber;

  if (req.body.qrCode !== undefined)
    update["bankQR.$.qrCode"] = req.body.qrCode;

  const updatedCompany = await CompanyInfnoModel.findOneAndUpdate(
    {
      _id: id,
      "bankQR._id": new mongoose.Types.ObjectId(bankQRId),
    },
    { $set: update },
    { new: true }
  );

  if (!updatedCompany) {
    return res.status(404).json({
      status: false,
      message: "Bank account not found",
    });
  }

  res.status(200).json({
    status: true,
    message: "Bank account updated successfully",
  });
});

exports.addCompanyBankQR = asyncHandler(async (req, res) => {
  try {
    const { name, accountNumber, qrCode } = req.body;
    const { id } = req.params;

    if (!name || !accountNumber) {
      return res.status(400).json({
        message: "Name and account number are required",
      });
    }

    if (!qrCode) {
      return res.status(400).json({
        message: "QR code image is required",
      });
    }

    const company = await CompanyInfnoModel.findById(id);
    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    const exists = company.bankQR.some(
      (b) => b.accountNumber === accountNumber
    );

    if (exists) {
      return res.status(409).json({
        message: "Bank account already exists",
      });
    }

    const newBankQR = {
      name,
      accountNumber,
      qrCode: qrCode || null,
    };

    company.bankQR.push(newBankQR);
    await company.save();

    res.status(201).json({
      message: "Bank account added successfully",
      data: newBankQR,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Error while adding bank account",
    });
  }
});
