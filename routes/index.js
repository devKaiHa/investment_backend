const investmentCompaniesRoute = require("./InvestmentsEntity/investmentCompaniesRoute");
const investorRoute = require("./investors/investorRoute");
const authRoute = require("./auth/authRoute");
const companyInfoRoute = require("./companyInfoRoute");
const clientCompanyRoute = require("./onbording/clientCompanyRoute");
const applicantRoute = require("./onbording/applicantRoute");
const investmentFundRoute = require("./InvestmentsEntity/investmentFundRoute");
const sharesRoute = require("./shares/sharesRoute");
const InvestmentsEntitySharedRoute = require("./InvestmentsEntity/InvestmentsEntitySharedRoute");
const shareTradeRequestRoute = require("./shares/shareTradeRequestRoute");
const notificationRoute = require("./utils/notificationRoute");
const profileRoute = require("./utils/profileRoute");
const roleRoute = require("./roleRoute");
const reportsRoute = require("./reports/reportsRoute");

const mountRoutes = (app) => {
  app.use("/api/auth", authRoute);
  // Investment Entites
  app.use("/api/investmentCompanies", investmentCompaniesRoute);
  app.use("/api/investmentFunds", investmentFundRoute);
  app.use("/api/investmentEntityShared", InvestmentsEntitySharedRoute);
  // Shares
  app.use("/api/shares", sharesRoute);
  app.use("/api/investor", investorRoute);

  app.use("/api/companyinfo", companyInfoRoute);
  app.use("/api/clientCompany", clientCompanyRoute);
  app.use("/api/applicants", applicantRoute);
  app.use("/api/shareTradeRequest", shareTradeRequestRoute);

  //utils
  app.use("/api/notifications", notificationRoute);
  app.use("/api/profile", profileRoute);
  app.use("/api/role", roleRoute);

  // Reports
  app.use("/api/reports", reportsRoute);
};

module.exports = mountRoutes;
