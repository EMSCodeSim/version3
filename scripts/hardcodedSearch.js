// hardcodedSearch.js

import { getDatabase, ref, get } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

/**
 * Gets a hardcoded response by exact key match or question match.
 * @param {string} userInput - The user’s input or question.
 * @returns {Promise<Object|null>} - Returns matching response data or null.
 */
export async function getHardcodedResponse(userInput) {
  const db = getDatabase();
  const lowerInput = userInput.trim().toLowerCase();

  // Try direct match as key
  const directRef = ref(db, `hardcodedResponses/${lowerInput}`);
  const directSnap = await get(directRef);

  if (directSnap.exists()) {
    const result = directSnap.val();
    return {
      matchType: "key",
      response: result.response || "",
      role: result.role || "Proctor",
      ttsAudio: result.ttsAudio || null,
      triggerFile: result.triggerFile || null,
      triggerFileType: result.triggerFileType || null
    };
  }

  // Try matching inside values using .question field
  const allSnap = await get(ref(db, "hardcodedResponses"));
  const allData = allSnap.val() || {};

  for (const [key, entry] of Object.entries(allData)) {
    if ((entry.question || "").trim().toLowerCase() === lowerInput) {
      return {
        matchType: "question",
        response: entry.response || "",
        role: entry.role || "Proctor",
        ttsAudio: entry.ttsAudio || null,
        triggerFile: entry.triggerFile || null,
        triggerFileType: entry.triggerFileType || null
      };
    }
  }

  return null;
}
