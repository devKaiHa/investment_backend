const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

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
    { expiresIn: process.env.JWT_EXPIRE_TIME }
  );
};

exports.sendEmail = async (options) => {
  try {
    //1- Create transporter (service that'll send email like "gmail","Mailgun","Mialtrap",...)
    const transporter = nodemailer.createTransport({
      service: "gmail",
      host: "smtp.gmail.com",
      port: 465, // if secure false port = 587, if true port = 465
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    //2- Define email options (Like from, to, subject, email, email content)
    const mailOpts = {
      from: { name: "SmartPos <smartinb.co@gmail.com>" },
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
