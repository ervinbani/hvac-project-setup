const crypto = require("crypto");
const { createOpenAI } = require("@ai-sdk/openai");
const { generateText } = require("ai");
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

    const { messages: frontendMessages, sessionId: existingSessionId } = result.data;
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

    // 3. Reconstruct full history:
    //    - Start with the saved tool messages from previous turns
    //    - Then add all assistant responses that match current frontend messages
    const savedToolCalls = session.messages.filter(
      (m) => m.role === "assistant" && m.tool_calls,
    );
    const savedToolResults = session.messages.filter((m) => m.role === "tool");

    // Build the full message list for the LLM
    const toolHistory = [];
    const toolCallMap = {};

    savedToolCalls.forEach((msg) => {
      toolHistory.push({
        role: "assistant",
        content: null,
        tool_calls: msg.tool_calls,
      });
      // Map tool_call_ids to their results
      msg.tool_calls.forEach((tc) => {
        toolCallMap[tc.id || tc.toolCallId] = null; // will be filled below
      });
    });

    savedToolResults.forEach((msg) => {
      toolHistory.push({
        role: "tool",
        tool_call_id: msg.tool_call_id,
        content: msg.content,
      });
    });

    // Combine: frontend messages interleaved with tool history
    // We place tool history after the turn where it was generated
    const fullMessages = [...frontendMessages];

    // Append relevant tool calls from previous turns
    // Tool messages are appended at the end — the LLM uses them as context
    const llmMessages = [...frontendMessages, ...toolHistory].slice(-40);

    // 4. Build tools and prompt
    const tools = buildTools(req);
    const systemPrompt = buildSystemPrompt(req.user, tools);

    // 5. Call LLM and capture intermediate steps
    const stepMessages = [];

    const { text } = await generateText({
      model: getModel(),
      system: systemPrompt,
      messages: llmMessages,
      tools,
      maxSteps: 12,
      onStepFinish: (step) => {
        // Save tool calls and results from this step
        if (step.toolCalls && step.toolCalls.length > 0) {
          stepMessages.push({
            role: "assistant",
            content: null,
            tool_calls: step.toolCalls.map((tc) => ({
              id: tc.toolCallId,
              type: "function",
              function: {
                name: tc.toolName,
                arguments: JSON.stringify(tc.args),
              },
            })),
          });

          step.toolResults.forEach((tr) => {
            stepMessages.push({
              role: "tool",
              tool_call_id: tr.toolCallId,
              content: typeof tr.result === "string"
                ? tr.result
                : JSON.stringify(tr.result),
            });
          });
        }
      },
    });

    // 6. Save assistant response and intermediate tool messages to session
    session.messages.push({
      role: "assistant",
      content: text,
      timestamp: new Date(),
    });

    stepMessages.forEach((msg) => {
      session.messages.push({ ...msg, timestamp: new Date() });
    });

    // Trim session history to last 100 messages to prevent unbounded growth
    if (session.messages.length > 100) {
      const toolOnlyMessages = session.messages.filter(
        (m) => m.role === "assistant" || m.role === "tool",
      );
      const lastUserMessages = session.messages
        .filter((m) => m.role === "user")
        .slice(-30);

      session.messages = [...lastUserMessages, ...toolOnlyMessages.slice(-70)];
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
