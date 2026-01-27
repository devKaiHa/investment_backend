const investmentCompaniesRoute = require("./investmentCompaniesRoute");
const investorRoute = require("./investorRoute");
const investorSharesRoute = require("./investorSharesRoute");
const sharePurchaseRequestRoute = require("./sharePurchaseRequestRoute");
const authRoute = require("./authRoute");
const companyInfoRoute = require("./companyInfoRoute");
const clientCompanyRoute = require("./clientCompanyRoute");
const applicantRoute = require("./applicantRoute");

const mountRoutes = (app) => {
  app.use("/api/investmentCompanies", investmentCompaniesRoute);
  app.use("/api/investor", investorRoute);
  app.use("/api/investorShares", investorSharesRoute);
  app.use("/api/sharePurchaseRequest", sharePurchaseRequestRoute);
  app.use("/api/auth", authRoute);
  app.use("/api/companyinfo", companyInfoRoute);
  app.use("/api/clientCompany", clientCompanyRoute);
  app.use("/api/applicants", applicantRoute);
};

module.exports = mountRoutes;
