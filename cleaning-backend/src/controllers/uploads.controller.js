const { PutObjectCommand, DeleteObjectCommand, GetObjectCommand, ListObjectsV2Command } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { randomUUID } = require("crypto");
const path = require("path");
const r2Client = require("../config/r2");

// Allowed MIME types and their file extensions
const ALLOWED_TYPES = {
  "application/pdf": ".pdf",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

// Valid resource types → maps to storage path segment
const VALID_RESOURCES = ["invoices", "customers", "jobs", "services", "tenants"];

const PRESIGNED_URL_TTL = 300; // 5 minutes
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

/**
 * GET /api/uploads/presigned-url
 * Query: resource, refId, filename, contentType, fileSize (optional bytes)
 * Returns a presigned PUT URL for direct client-to-R2 upload
 */
const getPresignedUploadUrl = async (req, res) => {
  const { resource, refId, filename, contentType, fileSize } = req.query;
  const tenantId = req.user.tenantId;

  // --- Validation ---
  if (!resource || !refId || !filename || !contentType) {
    return res.status(400).json({
      success: false,
      error: "resource, refId, filename and contentType are required",
    });
  }

  if (!VALID_RESOURCES.includes(resource)) {
    return res.status(400).json({
      success: false,
      error: `resource must be one of: ${VALID_RESOURCES.join(", ")}`,
    });
  }

  if (!ALLOWED_TYPES[contentType]) {
    return res.status(400).json({
      success: false,
      error: `contentType not allowed. Allowed: ${Object.keys(ALLOWED_TYPES).join(", ")}`,
    });
  }

  if (fileSize && parseInt(fileSize, 10) > MAX_FILE_SIZE) {
    return res.status(400).json({
      success: false,
      error: `File exceeds maximum allowed size of ${MAX_FILE_SIZE / 1024 / 1024} MB`,
    });
  }

  // Sanitize filename: strip path components, keep only safe characters
  const safeBasename = path
    .basename(filename)
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(0, 100);

  const ext = ALLOWED_TYPES[contentType];
  const uniqueKey = `${tenantId}/${resource}/${refId}/${randomUUID()}-${safeBasename}${safeBasename.endsWith(ext) ? "" : ext}`;

  try {
    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: uniqueKey,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(r2Client, command, {
      expiresIn: PRESIGNED_URL_TTL,
    });

    return res.status(200).json({
      success: true,
      data: {
        uploadUrl,
        key: uniqueKey,
        expiresIn: PRESIGNED_URL_TTL,
      },
    });
  } catch (err) {
    console.error("[R2] getPresignedUploadUrl error:", err.message);
    return res.status(500).json({ success: false, error: "Could not generate upload URL" });
  }
};

/**
 * GET /api/uploads/presigned-read
 * Query: key
 * Returns a presigned GET URL to read a private file (TTL 1h)
 */
const getPresignedReadUrl = async (req, res) => {
  const { key } = req.query;
  const tenantId = req.user.tenantId;

  if (!key) {
    return res.status(400).json({ success: false, error: "key is required" });
  }

  // Ensure the key belongs to the requesting tenant (tenant isolation)
  if (!key.startsWith(`${tenantId}/`)) {
    return res.status(403).json({ success: false, error: "Access denied" });
  }

  try {
    const command = new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
    });

    const readUrl = await getSignedUrl(r2Client, command, { expiresIn: 3600 });

    return res.status(200).json({
      success: true,
      data: { readUrl, expiresIn: 3600 },
    });
  } catch (err) {
    console.error("[R2] getPresignedReadUrl error:", err.message);
    return res.status(500).json({ success: false, error: "Could not generate read URL" });
  }
};

/**
 * DELETE /api/uploads
 * Body: { key }
 * Deletes a file from R2 — restricted to owner/director/manager
 */
const deleteFile = async (req, res) => {
  const { key } = req.body;
  const tenantId = req.user.tenantId;

  if (!key) {
    return res.status(400).json({ success: false, error: "key is required" });
  }

  // Tenant isolation: key must start with tenantId
  if (!key.startsWith(`${tenantId}/`)) {
    return res.status(403).json({ success: false, error: "Access denied" });
  }

  try {
    await r2Client.send(
      new DeleteObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: key,
      }),
    );

    return res.status(200).json({ success: true, data: { deleted: key } });
  } catch (err) {
    console.error("[R2] deleteFile error:", err.message);
    return res.status(500).json({ success: false, error: "Could not delete file" });
  }
};

const PAGE_SIZE = 10;

/**
 * GET /api/uploads/list
 * Query: resource (required), refId (optional), cursor (optional, from previous response)
 * Returns paginated list of files (10 per page) for a given resource, scoped to the tenant
 */
const listFiles = async (req, res) => {
  const { resource, refId, cursor } = req.query;
  const tenantId = req.user.tenantId;

  if (!resource) {
    return res.status(400).json({ success: false, error: "resource is required" });
  }

  if (!VALID_RESOURCES.includes(resource)) {
    return res.status(400).json({
      success: false,
      error: `resource must be one of: ${VALID_RESOURCES.join(", ")}`,
    });
  }

  // Build prefix: tenantId/resource/ or tenantId/resource/refId/
  const prefix = refId
    ? `${tenantId}/${resource}/${refId}/`
    : `${tenantId}/${resource}/`;

  try {
    const command = new ListObjectsV2Command({
      Bucket: process.env.R2_BUCKET_NAME,
      Prefix: prefix,
      MaxKeys: PAGE_SIZE,
      ...(cursor ? { ContinuationToken: cursor } : {}),
    });

    const response = await r2Client.send(command);
    const files = (response.Contents || []).map((obj) => ({
      key: obj.Key,
      size: obj.Size,
      lastModified: obj.LastModified,
      filename: obj.Key.split("/").pop(),
    }));

    return res.status(200).json({
      success: true,
      data: {
        files,
        count: files.length,
        hasMore: response.IsTruncated ?? false,
        nextCursor: response.NextContinuationToken ?? null,
      },
    });
  } catch (err) {
    console.error("[R2] listFiles error:", err.message);
    return res.status(500).json({ success: false, error: "Could not list files" });
  }
};

module.exports = { getPresignedUploadUrl, getPresignedReadUrl, deleteFile, listFiles };
