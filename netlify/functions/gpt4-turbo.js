const fetch = require('node-fetch');
const { initializeApp } = require('firebase/app');
const { getDatabase, ref, push } = require('firebase/database');

// Firebase JS SDK config (no private key needed)
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: "ems-code-sim.firebaseapp.com",
  databaseURL: "https://ems-code-sim-default-rtdb.firebaseio.com",
  projectId: "ems-code-sim",
  storageBucket: "ems-code-sim.firebasestorage.app",
  messagingSenderId: "190498607578",
  appId: "1:190498607578:web:4cf6c8e999b027956070e3"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Save function using JS SDK
const saveToFirebase = async (content, reply, role) => {
  try {
    await push(ref(db, "hardcodeReview"), {
      userQuestion: content,
      aiResponse: reply,
      role,
      timestamp: Date.now()
    });
    console.log("✅ Firebase write (JS SDK) successful");
  } catch (err) {
    console.error("❌ Firebase write failed (JS SDK):", err.message);
  }
};

exports.handler = async function (event, context) {
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

    await saveToFirebase(content, reply, role);

    return {
      statusCode: 200,
      body: JSON.stringify({ reply })
    };

  } catch (error) {
    console.error("❌ GPT4 function error:", error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Server error' })
    };
  }
};
