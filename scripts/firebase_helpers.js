// firebase_helpers.js
import { getDatabase, ref, get } from "firebase/database";

export async function fetchHardcodedResponses() {
  const db = getDatabase();
  const snapshot = await get(ref(db, "/hardcodedResponses"));
  return snapshot.exists() ? snapshot.val() : {};
}
