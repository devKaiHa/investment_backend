const Notification = require("../../models/utils/notificationModel");
const asyncHandler = require("express-async-handler");

exports.createNotification = ({ user, type, title, message, meta = {} }) => {
  return Notification.create({
    user,
    type,
    title,
    message,
    meta,
  });
};

//@route GET /api/notifications
exports.getMyNotifications = asyncHandler(async (req, res) => {
  const { id, page = 1, limit = 10, isRead } = req.query;
  // authUserId must be passed

  if (!id)
    return res.status(400).json({
      status: false,
      message: "ID is required",
    });

  const skip = (page - 1) * limit;
  const query = {
    user: id,
    isRead: isRead === "true",
  };

  const notifications = await Notification.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await Notification.countDocuments(query);

  res.status(200).json({
    data: notifications,
    page,
    pages: Math.ceil(total / limit),
    total,
  });
});

//@route PATCH /api/notifications/:id/read
exports.markAsRead = asyncHandler(async (req, res) => {
  if (!req.params.id)
    return res.status(400).json({
      status: false,
      message: "ID is required",
    });

  if (!req.query.authUserId)
    return res.status(400).json({
      status: false,
      message: "authUserId is required",
    });

  const notification = await Notification.findOneAndUpdate(
    {
      _id: req.params.id,
      user: req.query.authUserId,
    },
    { isRead: true },
    { new: true },
  );

  if (!notification) {
    res.status(404);
    throw new Error("Notification not found");
  }

  res.status(200).json({ data: notification });
});

//@route PATCH /api/notifications/read-all
exports.markAllAsRead = asyncHandler(async (req, res) => {
  if (!req.query.authUserId)
    return res.status(400).json({
      status: false,
      message: "ID is required",
    });

  await Notification.updateMany(
    {
      user: req.query.authUserId,
      isRead: false,
    },
    { isRead: true },
  );

  res.status(200).json({ success: true });
});
