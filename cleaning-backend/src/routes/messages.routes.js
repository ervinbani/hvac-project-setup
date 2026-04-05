const express = require("express");
const router = express.Router();
const {
  listMessages,
  sendMessage,
  deleteMessageLog,
} = require("../controllers/messages.controller");
const auth = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");

const ADMIN_STAFF = [
  "owner",
  "director",
  "manager_operations",
  "manager_hr",
  "staff",
];

router.use(auth);

router.get("/", listMessages);
router.post("/send", requireRole(...ADMIN_STAFF), sendMessage);
router.delete("/:id", requireRole(...ADMIN_STAFF), deleteMessageLog);

module.exports = router;
