// hardcode_logger.js

import { getDatabase, ref, push } from "firebase/database";

/**
 * Save a GPT-generated response to the /pendingApproval queue in Firebase.
 * @param {string} input - The user input that triggered the GPT response.
 * @param {string} gptReply - The GPT-generated reply.
 * @param {object} context - Additional scenario/contextual info (optional).
 */
export async function saveToHardcodeApprovalQueue(input, gptReply, context = {}) {
  const db = getDatabase();
  const pendingRef = ref(db, "/pendingApproval");

  const entry = {
    timestamp: new Date().toISOString(),
    input: input,
    gptReply: gptReply,
    scenarioId: context?.scenarioId || "unknown",
    role: context?.role || "unspecified",
    approved: false
  };

  await push(pendingRef, entry);
}
