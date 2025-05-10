const fetch = require('node-fetch');
const admin = require('firebase-admin');

// ✅ Initialize Firebase Admin from environment variable
if (!admin.apps.length) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_SDK);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: "https://ems-code-sim-default-rtdb.firebaseio.com"
    });
  } catch (err) {
    console.error("Failed to initialize Firebase Admin:", err.message);
  }
}

const db = admin.apps.length ? admin.database() : null;

exports.handler = async function(event, context) {
  try {
    const { content } = JSON.parse(event.body || '{}');
    if (!content) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing message content.' })
      };
    }

    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

    const proctorKeywords = [
      'scene safe', 'bsi', 'scene', 'blood pressure', 'pulse', 'respiratory rate', 'saO2',
      'skin color', 'bgl', 'blood sugar', 'breath sounds', 'lung sounds', 'oxygen', 'NRB',
      'nasal cannula', 'splint', 'transport', 'stretcher', 'spinal immobilization', 'move patient',
      'position patient', 'load and go', 'procedure', 'place patient', 'emergent transport',
      'administer', 'give aspirin', 'give nitro', 'asa', 'oral glucose', 'epinephrine',
      'check pupils', 'immobilize'
    ];

    const role = proctorKeywords.some(k => content.toLowerCase().includes(k)) ? 'Proctor' : 'Patient';
    const prompt = role === 'Patient'
      ? "You are a patient in a realistic EMS scenario. Answer emotionally and from the patient's perspective."
      : "You are a certified NREMT Proctor responding only with exam-related facts, vitals, or procedural confirmations.";

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content }
        ],
        temperature: 0.5
      })
    });

    const result = await response.json();
    const reply = result.choices?.[0]?.message?.content?.trim() || '[No reply received]';

    // ✅ Save to Firebase review database
    if (db) {
      await db.ref("hardcodeReview").push({
        userQuestion: content,
        aiResponse: reply,
        role,
        timestamp: Date.now()
      });
    } else {
      console.warn("Firebase DB not initialized. GPT answer not logged.");
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ reply })
    };

  } catch (error) {
    console.error("GPT4 function error:", error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Server error' })
    };
  }
};
