// admin_panel.js

async function approveEntry(key, question) {
  try {
    const response = document.getElementById(`resp-${key}`).value;
    const role = document.getElementById(`role-${key}`).value;

    // Optional: Show loading spinner here

    const res = await fetch('/.netlify/functions/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: response, speaker: role.toLowerCase() })
    });

    const json = await res.json();

    // Check for TTS errors
    if (!res.ok || !json.audio) {
      alert("TTS audio generation failed: " + (json.error || "Unknown error."));
      // Optional: Hide spinner
      return;
    }

    await db.ref('hardcodedResponses').push({
      question, response, role, ttsAudio: json.audio
    });
    await db.ref(`hardcodeReview/${key}`).remove();
    loadResponses();
    // Optional: Show success toast
  } catch (err) {
    alert("Approval failed: " + err.message);
    // Optional: Hide spinner
  }
}

async function saveEntry(key) {
  try {
    const response = document.getElementById(`resp-${key}`).value;
    const role = document.getElementById(`role-${key}`).value;

    // Optional: Show loading spinner here

    const res = await fetch('/.netlify/functions/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: response, speaker: role.toLowerCase() })
    });

    const json = await res.json();

    // Check for TTS errors
    if (!res.ok || !json.audio) {
      alert("TTS audio generation failed: " + (json.error || "Unknown error."));
      // Optional: Hide spinner
      return;
    }

    await db.ref('hardcodedResponses').push({
      question: "(manual entry)",
      response,
      role,
      ttsAudio: json.audio
    });
    await db.ref(`hardcodeReview/${key}`).remove();
    loadResponses();
    // Optional: Show success toast
  } catch (err) {
    alert("Save failed: " + err.message);
    // Optional: Hide spinner
  }
}

// (Add the rest of your admin_panel.js logic here: loadResponses, UI helpers, etc.)

// Example dummy implementations to avoid JS errors if missing
function loadResponses() {
  // Reload responses list in the admin panel.
  // Actual code here...
}

// Assume your Firebase `db` variable is initialized at the top of your file as in your original setup
// Example:
// import { getDatabase } from "firebase/database";
// const db = getDatabase();
