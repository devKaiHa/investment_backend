const investmentCompaniesRoute = require("./InvestmentsEntity/investmentCompaniesRoute");
const investorRoute = require("./investorRoute");
const investorSharesRoute = require("./investorSharesRoute");
const sharePurchaseRequestRoute = require("./sharePurchaseRequestRoute");
const authRoute = require("./auth/authRoute");
const companyInfoRoute = require("./companyInfoRoute");
const clientCompanyRoute = require("./onbording/clientCompanyRoute");
const applicantRoute = require("./onbording/applicantRoute");
const investmentFundRoute = require("./InvestmentsEntity/investmentFundRoute");
const sharesHoldingRoute = require("./shares/sharesRoute");
const InvestmentsEntitySharedRoute = require("./InvestmentsEntity/InvestmentsEntitySharedRoute");

const mountRoutes = (app) => {
  app.use("/api/investmentCompanies", investmentCompaniesRoute);
  app.use("/api/investmentFunds", investmentFundRoute);
  app.use("/api/investmentEntityLog", InvestmentsEntitySharedRoute);
  app.use("/api/sharesholding", sharesHoldingRoute);
  app.use("/api/investor", investorRoute);
  app.use("/api/investorShares", investorSharesRoute);
  app.use("/api/sharePurchaseRequest", sharePurchaseRequestRoute);
  app.use("/api/auth", authRoute);
  app.use("/api/companyinfo", companyInfoRoute);
  app.use("/api/clientCompany", clientCompanyRoute);
  app.use("/api/applicants", applicantRoute);
};

module.exports = mountRoutes;
