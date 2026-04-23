const express = require("express");
const router = express.Router();
const {
  getPresignedUploadUrl,
  getPresignedReadUrl,
  deleteFile,
  listFiles,
} = require("../controllers/uploads.controller");
const auth = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");

const UPLOAD_ROLES = [
  "owner",
  "director",
  "manager_operations",
  "manager_hr",
  "staff",
];
const DELETE_ROLES = ["owner", "director", "manager_operations"];

router.use(auth);

// Generate a presigned PUT URL for direct upload to R2
router.get(
  "/presigned-url",
  requireRole(...UPLOAD_ROLES),
  getPresignedUploadUrl,
);

// Generate a presigned GET URL to read a private file
router.get(
  "/presigned-read",
  requireRole(...UPLOAD_ROLES),
  getPresignedReadUrl,
);

// List files for a resource (and optionally a specific refId)
router.get("/list", requireRole(...UPLOAD_ROLES), listFiles);

// Delete a file from R2
router.delete("/", requireRole(...DELETE_ROLES), deleteFile);

module.exports = router;
