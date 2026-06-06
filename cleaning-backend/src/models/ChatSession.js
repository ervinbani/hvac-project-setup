const mongoose = require("mongoose");

const chatSessionSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },
    sessionId: {
      type: String,
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    messages: [
      {
        role: {
          type: String,
          enum: ["user", "assistant", "tool"],
          required: true,
        },
        content: String,
        tool_calls: Array,
        tool_call_id: String,
        timestamp: { type: Date, default: Date.now },
      },
    ],
    metadata: {
      businessType: String,
      userRole: String,
      activeConfirmationCode: String,
    },
  },
  { timestamps: true },
);

// TTL index: auto-delete sessions inactive for 24 hours
chatSessionSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 86400 });

// Compound index for lookups
chatSessionSchema.index({ tenantId: 1, sessionId: 1 }, { unique: true });

module.exports = mongoose.model("ChatSession", chatSessionSchema);
