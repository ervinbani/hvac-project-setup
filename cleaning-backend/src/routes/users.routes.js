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

const MANAGERS = ["owner", "director", "manager_operations", "manager_hr"];

router.get("/", requireRole(...MANAGERS), listUsers);
router.get("/:id", requireRole(...MANAGERS), getUser);
router.post("/", requireRole(...MANAGERS), createUser);
router.put("/:id", requireRole(...MANAGERS), updateUser);
router.delete("/:id", requireRole("owner"), deleteUser);

module.exports = router;
