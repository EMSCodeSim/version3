const { OpenAI } = require("openai");
const admin = require("firebase-admin");

// Initialize Firebase Admin only once
let firebaseApp;
if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  firebaseApp = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env.FIREBASE_DATABASE_URL // Make sure this is set!
  });
} else {
  firebaseApp = admin.app();
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

exports.handler = async function(event, context) {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }
    const { content, role, scenarioId = "unknown_scenario" } = JSON.parse(event.body);

    if (!content || content.length < 1) {
      return { statusCode: 400, body: JSON.stringify({ error: "Missing content." }) };
    }

    // Choose persona based on requested role (default: patient)
    let systemPrompt = "";
    if ((role || "").toLowerCase().includes("proctor")) {
      systemPrompt =
        "You are an NREMT exam proctor. Only provide objective, procedural, or measurable information. " +
        "Do NOT provide emotional, subjective, or symptom-based answers. Never play the patient. " +
        "If the question is for the patient, respond with 'This is a proctor-only question.' " +
        "If asked about assessment results, vitals, or scene information, answer concisely. If asked for advice, say you can't assist.";
    } else {
      // Default: patient role
      systemPrompt =
        "You are playing the role of an EMS patient. Answer as the patient would, based on realistic symptoms, emotions, and history. " +
        "Respond to questions like a real patient—never provide proctor-style or test-answer feedback. Stay in character as the patient only.";
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content }
      ],
      max_tokens: 220,
      temperature: 0.6
    });

    let reply = completion.choices?.[0]?.message?.content?.trim() || "";

    // --- Save Q&A to Firebase Realtime DB ---
    try {
      const db = admin.database();
      const logRef = db.ref(`gpt4turbo_logs/${scenarioId}`);
      const logEntry = {
        question: content,
        answer: reply,
        timestamp: Date.now(),
        role: role || "patient"
      };
      // Use push for unique key
      await logRef.push(logEntry);
    } catch (fbErr) {
      console.error("Firebase logging error:", fbErr);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ reply })
    };
  } catch (err) {
    console.error("GPT4 Turbo error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message || "Unknown error." })
    };
  }
};
