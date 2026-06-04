const express = require("express");
const router = express.Router();
const { chat } = require("../controllers/ai.controller");
const auth = require("../middleware/auth");

// All AI routes require a valid JWT — no unauthenticated access
router.use(auth);

// POST /api/ai/chat
// Body: { messages: [{ role: "user" | "assistant", content: string }] }
router.post("/chat", chat);

module.exports = router;
