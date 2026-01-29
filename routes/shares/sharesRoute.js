const express = require("express");
const {
  getSharesHoldings,
} = require("../../services/shares/shareHoldingService");

const sharesHoldingRoute = express.Router();

sharesHoldingRoute.route("/").get(getSharesHoldings);

module.exports = sharesHoldingRoute;
