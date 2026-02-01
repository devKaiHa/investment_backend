const investmentCompaniesRoute = require("./InvestmentsEntity/investmentCompaniesRoute");
const investorRoute = require("./investorRoute");
const investorSharesRoute = require("./investorSharesRoute");
const authRoute = require("./auth/authRoute");
const companyInfoRoute = require("./companyInfoRoute");
const clientCompanyRoute = require("./onbording/clientCompanyRoute");
const applicantRoute = require("./onbording/applicantRoute");
const investmentFundRoute = require("./InvestmentsEntity/investmentFundRoute");
const sharesHoldingRoute = require("./shares/sharesRoute");
const InvestmentsEntitySharedRoute = require("./InvestmentsEntity/InvestmentsEntitySharedRoute");
const shareTradeRequestRoute = require("./shares/shareTradeRequestRoute");

const mountRoutes = (app) => {
  app.use("/api/auth", authRoute);
  // Investment Entites
  app.use("/api/investmentCompanies", investmentCompaniesRoute);
  app.use("/api/investmentFunds", investmentFundRoute);
  app.use("/api/investmentEntityShared", InvestmentsEntitySharedRoute);
  // Shares
  app.use("/api/sharesholding", sharesHoldingRoute);
  app.use("/api/investor", investorRoute);
  app.use("/api/investorShares", investorSharesRoute);

  app.use("/api/companyinfo", companyInfoRoute);
  app.use("/api/clientCompany", clientCompanyRoute);
  app.use("/api/applicants", applicantRoute);
  app.use("/api/shareTradeRequest", shareTradeRequestRoute);
};

module.exports = mountRoutes;
