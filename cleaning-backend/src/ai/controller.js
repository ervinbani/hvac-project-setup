const crypto = require("crypto");
const { createOpenAI } = require("@ai-sdk/openai");
const { generateText, stepCountIs } = require("ai");
const { z } = require("zod");
const { buildSystemPrompt } = require("./prompts/system");
const { buildTools } = require("./tools");
const ChatSession = require("../models/ChatSession");

const MessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(10000),
});

const ChatSchema = z.object({
  messages: z.array(MessageSchema).min(1).max(20),
  sessionId: z.string().optional(),
});

function getModel() {
  const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return openai("gpt-4o-mini");
}

const chat = async (req, res, next) => {
  try {
    const result = ChatSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: result.error.issues.map((i) => ({
          field: i.path.join("."),
          message: i.message,
        })),
      });
    }

    const { messages: frontendMessages, sessionId: existingSessionId } =
      result.data;
    const { tenantId, id: userId, role, businessType } = req.user;

    // 1. Load or create session
    const sessionId = existingSessionId || crypto.randomUUID();
    let session = await ChatSession.findOne({ tenantId, sessionId });

    if (!session) {
      session = await ChatSession.create({
        tenantId,
        sessionId,
        userId,
        messages: [],
        metadata: { businessType, userRole: role },
      });
    }

    // 2. Append new user messages to session history
    const userMessagesToSave = frontendMessages
      .filter((m) => m.role === "user")
      .map((m) => ({
        role: "user",
        content: m.content,
        timestamp: new Date(),
      }));

    if (userMessagesToSave.length > 0) {
      session.messages.push(...userMessagesToSave);
    }

    // 3. Build message list for the LLM — use only the frontend conversation history.
    //    generateText with maxSteps handles the tool-call loop internally within
    //    a single call, so we do not need to replay raw tool_calls/tool messages.
    const llmMessages = frontendMessages.slice(-40);

    // 4. Build tools and prompt
    const tools = buildTools(req);
    const systemPrompt = buildSystemPrompt(req.user, tools);

    // 5. Call LLM and capture intermediate steps
    const { text } = await generateText({
      model: getModel(),
      system: systemPrompt,
      messages: llmMessages,
      tools,
      stopWhen: stepCountIs(12),
    });

    // 6. Save assistant response to session
    session.messages.push({
      role: "assistant",
      content: text,
      timestamp: new Date(),
    });

    // Trim session history to last 100 messages to prevent unbounded growth
    if (session.messages.length > 100) {
      const lastUserMessages = session.messages
        .filter((m) => m.role === "user")
        .slice(-50);
      const lastAssistantMessages = session.messages
        .filter((m) => m.role === "assistant")
        .slice(-50);
      session.messages = [...lastUserMessages, ...lastAssistantMessages].sort(
        (a, b) => new Date(a.timestamp) - new Date(b.timestamp),
      );
    }

    await session.save();

    // 7. Return only the text reply (no tool calls exposed to frontend)
    res.json({
      success: true,
      data: { reply: text, sessionId },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { chat };
