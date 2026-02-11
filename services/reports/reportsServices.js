const asyncHandler = require("express-async-handler");
const InvestmentFund = require("../../models/InvestmentsEntity/investmentFundModel");
const Applicant = require("../../models/onbording/applicantModel");
const ShareHolder = require("../../models/shares/sharesHolderModel");
const Investor = require("../../models/investorModel");
const countryCodes = require("../utils/countryCodes.json");

exports.getFundsReport = asyncHandler(async (req, res) => {
  const stats = await InvestmentFund.aggregate([
    {
      $group: {
        _id: null,

        totalFunds: { $sum: 1 },

        totalActiveFunds: {
          $sum: {
            $cond: [{ $eq: ["$active", true] }, 1, 0],
          },
        },

        totalInactiveFunds: {
          $sum: {
            $cond: [{ $eq: ["$active", false] }, 1, 0],
          },
        },

        totalIssuedFunds: {
          $sum: {
            $cond: [{ $eq: ["$shareIssued", true] }, 1, 0],
          },
        },

        totalNotIssuedFunds: {
          $sum: {
            $cond: [{ $eq: ["$shareIssued", false] }, 1, 0],
          },
        },

        totalActiveAndIssuedFunds: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ["$active", true] },
                  { $eq: ["$shareIssued", true] },
                ],
              },
              1,
              0,
            ],
          },
        },
      },
    },
  ]);

  const result = stats[0] || {
    totalFunds: 0,
    totalActiveFunds: 0,
    totalInactiveFunds: 0,
    totalIssuedFunds: 0,
    totalNotIssuedFunds: 0,
    totalActiveAndIssuedFunds: 0,
  };

  res.status(200).json({
    status: true,
    data: result,
  });
});

exports.getInvestorReport = asyncHandler(async (req, res) => {
  const totalInvestorsPromise = Investor.countDocuments();

  const shareholdersPromise = ShareHolder.aggregate([
    {
      $match: {
        holderType: "investors",
        shares: { $gt: 0 },
      },
    },
    { $group: { _id: "$holderId" } },
    { $count: "totalShareholderInvestors" },
  ]);

  const [totalInvestors, shareholdersAgg] = await Promise.all([
    totalInvestorsPromise,
    shareholdersPromise,
  ]);

  const totalShareholderInvestors =
    shareholdersAgg[0]?.totalShareholderInvestors || 0;

  res.status(200).json({
    status: true,
    data: {
      totalInvestors,
      totalShareholderInvestors,
    },
  });
});

exports.getTopInvestorsByShares = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 5;
  const sortDirection = String(req.query.sort).startsWith("-") ? -1 : 1;

  const topInvestors = await ShareHolder.aggregate([
    {
      $match: {
        holderType: "investors",
        shares: { $gt: 0 },
      },
    },
    {
      $group: {
        _id: "$holderId",
        totalShares: { $sum: "$shares" },
      },
    },
    {
      $sort: { totalShares: sortDirection },
    },
    {
      $limit: limit,
    },
    {
      $lookup: {
        from: "investors",
        localField: "_id",
        foreignField: "_id",
        as: "investor",
      },
    },
    {
      $unwind: "$investor",
    },
    {
      $project: {
        _id: 0,
        investorId: "$investor._id",
        fullName: "$investor.fullName",
        email: "$investor.email",
        profileImage: "$investor.profileImage",
        totalShares: 1,
      },
    },
  ]);

  res.status(200).json({
    status: true,
    data: topInvestors,
  });
});

exports.getApplicantReviewReport = asyncHandler(async (req, res) => {
  const stats = await Applicant.aggregate([
    {
      $group: {
        _id: "$reviewStatus",
        count: { $sum: 1 },
      },
    },
  ]);

  const formatted = {
    draft: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    total: 0,
  };

  stats.forEach((item) => {
    formatted[item._id] = item.count;
    formatted.total += item.count;
  });

  res.status(200).json({
    status: true,
    data: formatted,
  });
});

exports.getTopApplicantCountry = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 1;

  const stats = await Applicant.aggregate([
    {
      $match: {
        phone: { $regex: /^\+/ },
      },
    },
    {
      $project: {
        phone: 1,
      },
    },
    {
      $group: {
        _id: "$phone",
        count: { $sum: 1 },
      },
    },
  ]);

  // Map phones to dial codes properly
  const countryCountMap = {};

  stats.forEach((item) => {
    const match = countryCodes.find((c) => item._id.startsWith(c.dialCode));

    if (match) {
      if (!countryCountMap[match.dialCode]) {
        countryCountMap[match.dialCode] = {
          name: match.name,
          nameAr: match.nameAr,
          code: match.code,
          flag: match.flag,
          dialCode: match.dialCode,
          totalRequests: 0,
        };
      }

      countryCountMap[match.dialCode].totalRequests += item.count;
    }
  });

  const result = Object.values(countryCountMap)
    .sort((a, b) => b.totalRequests - a.totalRequests)
    .slice(0, limit);

  res.status(200).json({
    status: true,
    data: result.length ? result : null,
  });
});
