const asyncHandler = require("express-async-handler");
const CompanyInfnoModel = require("../models/companyInfoModel");
const multer = require("multer");
const ApiError = require("../utils/apiError");
const { v4: uuidv4 } = require("uuid");
const sharp = require("sharp");
const employeeModel = require("../models/employeeModel");
const bcrypt = require("bcryptjs");
const { default: axios } = require("axios");
const { generatePassword, sendEmail } = require("../utils/helpers");
const fs = require("fs");
const path = require("path");

const multerStorage = multer.memoryStorage();
const multerFilter = function (req, file, cb) {
  if (file.mimetype.startsWith("image")) {
    cb(null, true);
  } else {
    cb(new ApiError("Only images allowed", 400), false);
  }
};
const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
  limits: { fileSize: 2 * 1024 * 1024 },
});

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

exports.uploadPaymentMethodImages = upload.fields([
  { name: "shamCashQr", maxCount: 1 },
  { name: "usdtWalletQr", maxCount: 1 },
  { name: "bankQr", maxCount: 1 },
]);
exports.resizePaymentMethodImages = async (req, res, next) => {
  try {
    if (!req.files) return next();

    const uploadDir = "uploads/companyinfo/payment-methods";
    await fs.promises.mkdir(uploadDir, { recursive: true });

    // SHAM CASH QR
    if (req.files.shamCashQr?.[0]) {
      const filename = `shamcash-qr-${uuidv4()}.webp`;
      const uploadPath = path.join(uploadDir, filename);

      await sharp(req.files.shamCashQr[0].buffer)
        .rotate()
        .resize({ width: 600, height: 600, fit: "inside" })
        .webp({ quality: 85 })
        .toFile(uploadPath);

      // Inject into body so service saves it
      req.body.shamCash = {
        ...(req.body.shamCash || {}),
        qrCode: filename,
      };
    }

    // USDT QR
    if (req.files.usdtWalletQr?.[0]) {
      const filename = `usdt-qr-${uuidv4()}.webp`;
      const uploadPath = path.join(uploadDir, filename);

      await sharp(req.files.usdtWalletQr[0].buffer)
        .rotate()
        .resize({ width: 600, height: 600, fit: "inside" })
        .webp({ quality: 85 })
        .toFile(uploadPath);

      req.body.usdt = {
        ...(req.body.usdt || {}),
        walletQr: filename,
      };
    }

    // BANK QR
    if (req.files.bankQr?.[0]) {
      const filename = `bank-qr-${uuidv4()}.webp`;
      const uploadPath = path.join(uploadDir, filename);

      await sharp(req.files.bankQr[0].buffer)
        .rotate()
        .resize({ width: 600, height: 600, fit: "inside" })
        .webp({ quality: 85 })
        .toFile(uploadPath);

      // Inject into body so service saves it
      req.body.bank = {
        ...(req.body.bank || {}),
        qrCode: filename,
      };
    }

    next();
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      status: false,
      message: "Failed to process QR images",
    });
  }
};

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
        payload,
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
      { companyId: companyInfo._id },
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
      { new: true },
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

exports.deleteCompanyPaymentMethod = asyncHandler(async (req, res) => {
  const { id, paymentMethodId } = req.params;

  const updatedCompany = await CompanyInfnoModel.findByIdAndUpdate(
    id,
    {
      $pull: {
        paymentMethods: { _id: paymentMethodId },
      },
    },
    { new: true },
  );

  if (!updatedCompany) {
    return res.status(404).json({
      status: false,
      message: "Company or payment method not found",
    });
  }

  res.status(200).json({
    status: true,
    message: "Payment method deleted successfully",
  });
});

exports.updateCompanyPaymentMethod = asyncHandler(async (req, res) => {
  const { id, paymentMethodId } = req.params;

  const update = {};
  const allowedFields = ["bank", "shamCash", "usdt"];

  allowedFields.forEach((field) => {
    if (req.body[field]) {
      Object.keys(req.body[field]).forEach((key) => {
        update[`paymentMethods.$.${field}.${key}`] = req.body[field][key];
      });
    }
  });

  const updatedCompany = await CompanyInfnoModel.findOneAndUpdate(
    {
      _id: id,
      "paymentMethods._id": paymentMethodId,
    },
    { $set: update },
    { new: true },
  );

  if (!updatedCompany) {
    return res.status(404).json({
      status: false,
      message: "Payment method not found",
    });
  }

  res.status(200).json({
    status: true,
    message: "Payment method updated successfully",
  });
});

exports.addCompanyPaymentMethod = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { method, bank, shamCash, usdt } = req.body;

  if (!method) {
    return res.status(400).json({ message: "method is required" });
  }

  const company = await CompanyInfnoModel.findById(id);
  if (!company) {
    return res.status(404).json({ message: "Company not found" });
  }

  const payload = { method };

  if (method === "bank") payload.bank = bank;
  if (method === "shamCash") payload.shamCash = shamCash;
  if (method === "usdt") payload.usdt = usdt;

  company.paymentMethods.push(payload);
  await company.save();

  res.status(201).json({
    status: true,
    message: "Payment method added successfully",
    data: payload,
  });
});
