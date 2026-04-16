const { S3Client } = require("@aws-sdk/client-s3");

if (!process.env.R2_ENDPOINT) {
  throw new Error("R2_ENDPOINT is required");
}
if (!process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY) {
  throw new Error("R2 credentials are required");
}

const r2Client = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
  // Disable automatic checksum headers (CRC32) — not supported by browser PUT
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
});

module.exports = r2Client;
