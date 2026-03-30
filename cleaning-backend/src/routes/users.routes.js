const express = require("express");
const router = express.Router();
const {
  listUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
} = require("../controllers/users.controller");
const auth = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");

router.use(auth);

router.get("/", requireRole("owner", "manager"), listUsers);
router.get("/:id", requireRole("owner", "manager"), getUser);
router.post("/", requireRole("owner", "manager"), createUser);
router.put("/:id", requireRole("owner", "manager"), updateUser);
router.delete("/:id", requireRole("owner"), deleteUser);

module.exports = router;
