const fetch = require('node-fetch');
const admin = require('firebase-admin');

// ✅ Use service account from environment variable
if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_SDK);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://ems-code-sim-default-rtdb.firebaseio.com'
  });
}
const db = admin.database();

exports.handler = async function(event, context) {
  try {
    const { content } = JSON.parse(event.body);

    if (!content) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing message content.' })
      };
    }

    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

    // ✅ Detect if prompt is Proctor-related
    const proctorKeywords = [
      'scene safe', 'bsi', 'scene', 'blood pressure', 'pulse', 'respiratory rate', 'saO2',
      'skin color', 'bgl', 'blood sugar', 'breath sounds', 'lung sounds', 'oxygen', 'NRB',
      'nasal cannula', 'splint', 'transport', 'stretcher', 'spinal immobilization', 'move patient',
      'position patient', 'load and go', 'procedure', 'place patient', 'emergent transport',
      'administer', 'give aspirin', 'give nitro', 'asa', 'oral glucose', 'epinephrine',
      'immobilize', 'check pupils', 'response to painful stimuli'
    ];

    const role = proctorKeywords.some(k => content.toLowerCase().includes(k)) ? 'Proctor' : 'Patient';

    // ✅ Send request to OpenAI API
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4",
        messages: [
          { role: "system", content: "You are simulating a realistic EMS training scenario response." },
          { role: "user", content: content }
        ],
        temperature: 0.7
      })
    });

    const result = await response.json();

    const gptResponse = result.choices[0].message.content;

    // ✅ Log to Firebase under /hardcodedReview
    const hash = Buffer.from(content).toString('base64').slice(0, 16);
    await db.ref(`hardcodedReview/${hash}`).set({
      userQuestion: content,
      aiResponse: gptResponse,
      role: role
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ reply: gptResponse })
    };

  } catch (err) {
    console.error("GPT4-Turbo error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Server error' })
    };
  }
};
