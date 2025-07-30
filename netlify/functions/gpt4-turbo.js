const { OpenAI } = require("openai");
const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

// Initialize Firebase Admin using env vars
let firebaseApp;
if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  firebaseApp = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env.FIREBASE_DATABASE_URL
  });
} else {
  firebaseApp = admin.app();
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

exports.handler = async function(event, context) {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }

    const { content, role, scenarioId = "unknown_scenario", history = [] } = JSON.parse(event.body);

    if (!content || content.length < 1) {
      return { statusCode: 400, body: JSON.stringify({ error: "Missing content." }) };
    }

    // Try to load patient_data.json if it exists for scenario
    let patientData = {};
    try {
      const dataPath = path.join(__dirname, "scenarios", scenarioId, "patient_data.json");
      const raw = fs.readFileSync(dataPath, "utf-8");
      patientData = JSON.parse(raw);
    } catch (err) {
      console.warn("Could not load patient_data.json:", err.message);
    }

    // Build scenario summary
    const summaryParts = [];
    if (patientData.scenarioName) summaryParts.push(`Scenario: ${patientData.scenarioName}`);
    if (patientData.chiefComplaint) summaryParts.push(`Chief Complaint: ${patientData.chiefComplaint}`);
    if (patientData.dispatch) summaryParts.push(`Dispatch Information: ${patientData.dispatch}`);
    if (patientData.scene_description) summaryParts.push(`Scene Description: ${patientData.scene_description}`);
    const scenarioSummary = summaryParts.join("\n");

    const patientDescription = `
Patient Info:
- Age: ${patientData.patient_info?.age || "unknown"}
- Gender: ${patientData.patient_info?.gender || "unknown"}

Medical History: ${patientData.patient_history?.medical_history?.join(", ") || "None"}
Surgical History: ${patientData.patient_history?.surgical_history?.join(", ") || "None"}
Allergies: ${patientData.patient_history?.allergies?.join(", ") || "None"}
Social History: ${patientData.patient_history?.social_history?.join(", ") || "None"}
Medications: ${patientData.current_medications?.join(", ") || "None"}

Initial Vitals:
- BP: ${patientData.vitals?.initial?.blood_pressure || "N/A"}
- HR: ${patientData.vitals?.initial?.heart_rate || "N/A"}
- RR: ${patientData.vitals?.initial?.respiratory_rate || "N/A"}
- SpO₂: ${patientData.vitals?.initial?.oxygen_saturation || "N/A"}
- Pain: ${patientData.vitals?.initial?.pain_scale || "N/A"}
`.trim();

    // Role-based prompt
    let systemPrompt = "";
    if ((role || "").toLowerCase().includes("proctor")) {
      systemPrompt = `
You are an NREMT exam proctor. Only provide objective, procedural, or measurable information.
Do NOT provide emotional, subjective, or symptom-based answers. Never play the patient.
If the question is for the patient, respond with 'This is a proctor-only question.'
If asked about assessment results, vitals, or scene information, answer concisely.
If asked for advice, say you can't assist.

${scenarioSummary ? "\n\nScenario Details:\n" + scenarioSummary : ""}
`.trim();
    } else {
      systemPrompt = `
You are playing the role of an EMS patient. Answer as the patient would, based on realistic symptoms, emotions, and history.
Respond to questions like a real patient—never provide proctor-style or test-answer feedback.
Stay in character as the patient only.

${scenarioSummary ? "\n\nScenario Details:\n" + scenarioSummary : ""}
${patientDescription ? "\n\nPatient Description:\n" + patientDescription : ""}
`.trim();
    }

    // Build messages
    const messages = [{ role: "system", content: systemPrompt }];
    if (Array.isArray(history)) {
      for (const h of history) {
        if (h.role && h.content) messages.push({ role: h.role, content: h.content });
      }
    }
    messages.push({ role: "user", content });

    // Call GPT
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages,
      max_tokens: 220,
      temperature: 0.6
    });

    const reply = completion.choices?.[0]?.message?.content?.trim() || "";

    // Save to Firebase
    try {
      const db = admin.database();
      const logRef = db.ref(`gpt4turbo_logs/${scenarioId}`);
      const logEntry = {
        question: content,
        answer: reply,
        timestamp: Date.now(),
        role: role || "patient"
      };
      await logRef.push(logEntry);
      console.log("Saved to Firebase:", scenarioId);
    } catch (err) {
      console.error("Firebase logging error:", err.message);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ reply })
    };
  } catch (err) {
    console.error("GPT4 Turbo error:", err.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message || "Unknown error." })
    };
  }
};
