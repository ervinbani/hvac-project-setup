const express = require("express");
const router = express.Router();
const {
  getTenant,
  updateTenant,
  deleteTenant,
} = require("../controllers/tenant.controller");
const auth = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");

const ADMIN = ["owner", "director", "manager_operations", "manager_hr"];

router.use(auth);

router.get("/", getTenant);
router.put("/", requireRole(...ADMIN), updateTenant);
router.delete("/", requireRole("owner"), deleteTenant);

module.exports = router;
