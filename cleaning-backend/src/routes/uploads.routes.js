const express = require("express");
const router = express.Router();
const {
  getPresignedUploadUrl,
  getPresignedReadUrl,
  deleteFile,
  listFiles,
} = require("../controllers/uploads.controller");
const auth = require("../middleware/auth");
const authorize = require("../middleware/authorize");

router.use(auth);

// Generate a presigned PUT URL for direct upload to R2
router.get(
  "/presigned-url",
  authorize("documents.create"),
  getPresignedUploadUrl,
);

// Generate a presigned GET URL to read a private file
router.get(
  "/presigned-read",
  authorize("documents.read"),
  getPresignedReadUrl,
);

// List files for a resource (and optionally a specific refId)
router.get("/list", authorize("documents.read"), listFiles);

// Delete a file from R2
router.delete("/", authorize("documents.delete"), deleteFile);

module.exports = router;
