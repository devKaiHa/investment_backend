const express = require("express");
const {
  getMyNotifications,
  markAllAsRead,
  markAsRead,
} = require("../../services/utils/notificationService");

const notificationRoute = express.Router();

notificationRoute.get("/", getMyNotifications);
notificationRoute.patch("/:id/read", markAsRead);
notificationRoute.patch("/read-all", markAllAsRead);

module.exports = notificationRoute;
