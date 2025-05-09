const fetch = require('node-fetch');
const admin = require('firebase-admin');

// ✅ Initialize Firebase Admin
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

    const proctorKeywords = [
      'scene safe', 'bsi', 'scene', 'blood pressure', 'pulse', 'respiratory rate', 'saO2',
      'skin color', 'bgl', 'blood sugar', 'breath sounds', 'lung sounds', 'oxygen', 'NRB',
      'nasal cannula', 'splint', 'transport', 'stretcher', 'spinal immobilization', 'move patient',
      'position patient', 'load and go', 'procedure', 'place patient', 'emergent transport',
      'administer', 'give aspirin', 'give nitro', 'asa', 'oral glucose', 'epinephrine',
      'check pupils', 'immobilize'
    ];

    const lowerContent = content.toLowerCase();
    const isProctor = proctorKeywords.some(k => lowerContent.includes(k));
    const role = isProctor ? 'Proctor' : 'Patient';

    let systemPrompt = '';
    if (role === 'Patient') {
      systemPrompt = "You are a patient in a realistic EMS scenario. Answer emotionally and from the patient's perspective.";
    } else {
      systemPrompt = "You are a certified NREMT Proctor responding only with exam-related facts, vitals, or procedural confirmations.";
    }

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: content }
        ],
        temperature: 0.5
      })
    });

    const openaiData = await openaiResponse.json();

    if (!openaiData.choices || openaiData.choices.length === 0) {
      throw new Error('No choices returned from OpenAI.');
    }

    const aiReply = openaiData.choices[0].message.content.trim();

    // ✅ Log to Firebase under /hardcodedReview
    const hash = Buffer.from(content).toString('base64').slice(0, 16);
    await db.ref(`hardcodedReview/${hash}`).set({
      userQuestion: content,
      aiResponse: aiReply,
      role: role
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ reply: aiReply })
    };

  } catch (error) {
    console.error('Chat function error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to generate reply.' })
    };
  }
};
