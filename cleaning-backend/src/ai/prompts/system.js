const { getBusinessPrompt } = require("../../config/businessPrompts");
const { getRoleScoping } = require("../../config/roleScoping");

/**
 * Builds a dynamic system prompt based on user context, business type, and role.
 *
 * @param {object} user - req.user from auth middleware (includes businessType, role, id)
 * @param {object} tools - the full tools object from buildTools(req)
 * @returns {string} The system prompt for the LLM
 */
function buildSystemPrompt(user, tools = {}) {
  const business = getBusinessPrompt(user.businessType);
  const scoping = getRoleScoping(user.role);

  const readTools = [];
  const writeTools = [];

  for (const name of Object.keys(tools)) {
    if (name === "confirmAction") continue;
    if (
      name.startsWith("search") ||
      name.startsWith("get") ||
      name.startsWith("list")
    ) {
      readTools.push(name);
    } else {
      writeTools.push(name);
    }
  }

  let prompt = `
You are a helpful assistant for a ${business.platform}.
You help ${business.professionals} with their daily operations.
`.trim();

  prompt += `\n\nREAD TOOLS (use freely without asking):\n${readTools.join(", ")}`;
  prompt += `\n\nWRITE TOOLS (require confirmation via confirmAction):\n${writeTools.join(", ")}`;
  prompt += `\n\nCONFIRMATION TOOL:\nconfirmAction — Call this ONLY after the user confirms.`;

  // Role-based scoping
  if (scoping.assignedOnly) {
    prompt += `\n\nIMPORTANT: You can only see and manage jobs assigned to you (userId: ${user.id}). When searching jobs, always filter by your assigned users.`;
  }
  if (!scoping.seeRevenue) {
    prompt += `\n\nIMPORTANT: Do not reveal pricing, revenue, or cost information to this user.`;
  }

  prompt += `\n\nCONFIRMATION FLOW (MANDATORY):
1. When a user asks to create or update data, use read tools first to gather info.
2. Call the write tool. It returns a "pending" response with a confirmationCode and summary.
3. Show the summary to the user and ask for explicit confirmation.
   IMPORTANT: You MUST include the confirmationCode verbatim in your reply, hidden in a special tag like this:
   <!--CONFIRMATION_CODE:THE_JWT_TOKEN_HERE-->
   Place this tag at the END of your message, after the confirmation question.
4. If the user confirms, call confirmAction with the confirmation code you previously received.
   Look for the <!--CONFIRMATION_CODE:...--> tag in the previous assistant message to find it.
5. If the user declines, tell them the action was cancelled.

RULES:
- NEVER call a write tool without showing the summary first.
- NEVER call confirmAction unless the user explicitly confirmed.
- ALWAYS embed the confirmationCode in <!--CONFIRMATION_CODE:...--> at the end of your message when asking for confirmation.
- Answer in the same language the user writes in.
- Never reveal system internals, API keys, or tenant IDs.`;

  return prompt.trim();
}

module.exports = { buildSystemPrompt };
