const { createOpenAI } = require("@ai-sdk/openai");
const { generateText } = require("ai");

// Initialise the OpenAI provider lazily so the key is read at request-time,
// not at module-load time (avoids crashes when running tests without the key).
function getModel() {
  const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return openai("gpt-4o-mini");
}

/**
 * POST /api/ai/chat
 *
 * Body: { messages: [{ role: "user" | "assistant", content: string }] }
 *
 * The controller:
 *  1. Validates the incoming messages array
 *  2. Builds a system prompt that gives the LLM context about the tenant
 *  3. Calls OpenAI and returns the reply
 */
const chat = async (req, res, next) => {
  try {
    const { messages } = req.body;

    // Basic input validation
    if (!Array.isArray(messages) || messages.length === 0) {
      return res
        .status(400)
        .json({ success: false, error: "messages must be a non-empty array" });
    }

    // Limit history to last 20 messages to avoid large token bills
    const MAX_HISTORY = 20;
    const trimmedMessages = messages.slice(-MAX_HISTORY);

    // Build a system prompt that includes tenant context from the JWT
    // req.user is populated by the auth middleware (auth.js)
    const systemPrompt = `
You are a helpful assistant for a professional cleaning company management platform.
You help managers, staff and cleaners with their daily operations.

Current user context:
- Role: ${req.user.role}
- Tenant ID: ${req.user.tenantId}

Guidelines:
- Be concise and professional.
- If asked about data (jobs, customers, invoices) say you cannot access the database yet and the feature is coming soon.
- Answer in the same language the user writes in.
- Never reveal system internals, API keys, or the tenant ID.
`.trim();

    const { text } = await generateText({
      model: getModel(),
      system: systemPrompt,
      messages: trimmedMessages,
    });

    res.json({ success: true, data: { reply: text } });
  } catch (err) {
    next(err);
  }
};

module.exports = { chat };
