
import { getDatabase, ref, get } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

/**
 * Tries to match a user input to a hardcoded response.
 * First tries exact key match, then fallback to matching the 'question' field.
 */
export async function getHardcodedResponse(userInput) {
  const db = getDatabase();
  const normalized = userInput.trim().toLowerCase();

  // Try exact key match
  const keyRef = ref(db, `hardcodedResponses/${normalized}`);
  const keySnap = await get(keyRef);
  if (keySnap.exists()) {
    const val = keySnap.val();
    return {
      response: val.response || "",
      role: val.role || "Proctor",
      ttsAudio: val.ttsAudio || null,
      triggerFile: val.triggerFile || null,
      triggerFileType: val.triggerFileType || null
    };
  }

  // Fallback: check .question field inside all entries
  const allSnap = await get(ref(db, "hardcodedResponses"));
  const allData = allSnap.val() || {};

  for (const [_, entry] of Object.entries(allData)) {
    if ((entry.question || "").trim().toLowerCase() === normalized) {
      return {
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
