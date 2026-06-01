const express = require("express");
const router = express.Router();
const {
  listTimesheets,
  updateTimeEntry,
  deleteTimeEntry,
} = require("../controllers/timesheets.controller");
const auth = require("../middleware/auth");
const authorize = require("../middleware/authorize");
const requireRole = require("../middleware/requireRole");

const MANAGERS = ["owner", "director", "manager_operations", "manager_hr"];
const MANAGERS_OPS = ["owner", "director", "manager_operations"];

router.use(auth);

// All roles can read timesheets (own-only enforced in controller for worker/staff)
router.get("/", authorize("timesheets.read"), listTimesheets);

// Only managers can correct entries
router.patch(
  "/:jobId/:entryId",
  requireRole(...MANAGERS),
  authorize("timesheets.update"),
  updateTimeEntry,
);

// Only operations-level and above can delete entries
router.delete(
  "/:jobId/:entryId",
  requireRole(...MANAGERS_OPS),
  authorize("timesheets.delete"),
  deleteTimeEntry,
);

module.exports = router;
