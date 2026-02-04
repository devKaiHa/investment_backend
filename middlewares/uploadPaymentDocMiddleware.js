const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const { v4: uuidv4 } = require("uuid");

exports.processPaymentConfirmation = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        status: false,
        message: "Payment confirmation document is required",
      });
    }

    // Allow image OR pdf
    const isImage = req.file.mimetype.startsWith("image/");
    const isPdf = req.file.mimetype === "application/pdf";

    if (!isImage && !isPdf) {
      return res.status(400).json({
        status: false,
        message: "Only images or PDF files are allowed",
      });
    }

    const uploadDir = "uploads/PaymentConfirmations";
    await fs.promises.mkdir(uploadDir, { recursive: true });

    let filename;
    let uploadPath;

    if (isImage) {
      filename = `Payment-${uuidv4()}.webp`;
      uploadPath = path.join(uploadDir, filename);

      await sharp(req.file.buffer)
        .rotate()
        .resize({ width: 1200, height: 1200, fit: "inside" })
        .webp({ quality: 80 })
        .toFile(uploadPath);
    } else {
      // PDF — store directly
      filename = `Payment-${uuidv4()}.pdf`;
      uploadPath = path.join(uploadDir, filename);
      await fs.promises.writeFile(uploadPath, req.file.buffer);
    }

    // attach to body like your logo middleware
    req.body.paymentConfirmationDocument = filename;

    next();
  } catch (err) {
    return res.status(500).json({
      status: false,
      message: err?.message || "Failed to process payment document",
    });
  }
};
