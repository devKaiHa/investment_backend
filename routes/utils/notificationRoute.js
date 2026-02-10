const express = require("express");
const {
  getMyNotifications,
  markAllAsRead,
  markAsRead,
} = require("../../services/utils/notificationService");
const { protectAuth } = require("../../middlewares/protectAuth");

const notificationRoute = express.Router();
notificationRoute.use(protectAuth);

notificationRoute.get("/", getMyNotifications);
notificationRoute.patch("/:id/read", markAsRead);
notificationRoute.patch("/read-all", markAllAsRead);

module.exports = notificationRoute;
