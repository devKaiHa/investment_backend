const express = require("express");

const { login } = require("../../services/auth/authService");

const router = express.Router();

router.post("/login", login);

module.exports = router;
