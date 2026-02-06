const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");

exports.generatePassword = () => {
  const length = 8;
  const charset =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let password = "";

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    password += charset.charAt(randomIndex);
  }

  return password;
};

/**
 *
 * @returns A 6 digits pin code
 */
exports.generatePin = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 *
 * @param {*} text The value to be hashed
 * @returns Hashed value
 */
exports.hashHelper = async (text) => {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(text, salt);
};

exports.isEmail = (email) => {
  var emailReg = /^([\w-\.]+@([\w-]+\.)+[\w-]{2,4})?$/;
  if (!emailReg.test(email) || email == "") return false;
  else return true;
};

exports.getIP = async () => {
  try {
    const response = await fetch("https://api.ipify.org?format=json");
    const data = await response.json();
    return data.ip;
  } catch (error) {
    console.error("Error fetching IP address:", error);
    return null;
  }
};

exports.createToken = (payload, sessionId) => {
  return jwt.sign(
    { userId: payload._id, email: payload.email, sessionId },
    process.env.JWT_SECRET_KEY,
    { expiresIn: process.env.JWT_EXPIRE_TIME },
  );
};

exports.sendEmail = async (options) => {
  try {
    //1- Create transporter
    const transporter = nodemailer.createTransport({
      host: "mail.jadwainvest.com",
      port: 465, // if secure false port = 587, if true port = 465
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    //2- Define email options (from, to, subject, email, content)
    const mailOpts = {
      from: { name: "Jadwa Share Market <noreply@jadwainvest.com>" },
      to: options.email,
      subject: options.subject,
      text: options.message,
    };

    //3- Send email
    await transporter.sendMail(mailOpts);
    console.log("Email sent successfully");
  } catch (error) {
    console.error("Error sending email:", error);
  }
};

exports.normalizeBoolean = (v) => v === true || v === "true" || v === "1";

exports.safeJsonParse = (value, fallback) => {
  try {
    return typeof value === "string" ? JSON.parse(value) : value;
  } catch {
    return fallback;
  }
};
