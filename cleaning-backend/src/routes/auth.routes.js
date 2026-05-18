const express = require("express");
const router = express.Router();
const {
  register,
  verifyEmail,
  login,
  me,
  updateMe,
  forgotPassword,
  resetPassword,
} = require("../controllers/auth.controller");
const auth = require("../middleware/auth");

router.post("/register", register);
router.get("/verify-email", verifyEmail);
router.post("/login", login);
router.get("/me", auth, me);
router.put("/me", auth, updateMe);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

module.exports = router;
