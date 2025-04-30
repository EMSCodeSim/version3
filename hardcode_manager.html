const fetch = require('node-fetch');

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

    // Keywords to determine if the question should be routed to the proctor
    const proctorKeywords = [
      'scene safe', 'bsi', 'scene', 'blood pressure', 'pulse', 'respiratory rate', 'saO2',
      'skin color', 'bgl', 'blood sugar', 'breath sounds', 'lung sounds', 'oxygen', 'NRB',
      'nasal cannula', 'splint', 'transport', 'stretcher', 'spinal immobilization', 'move patient',
      'position patient', 'load and go', 'procedure', 'place patient', 'emergent transport',
      'administer', 'give aspirin', 'give nitro', 'asa', 'oral glucose', 'epinephrine', 'splint',
      'immobilize', 'check pupils', 'response to painful stimuli'
    ];

    const lowerContent = content.toLowerCase();
    const isProctorQuestion = proctorKeywords.some(keyword => lowerContent.includes(keyword));
    const responder = isProctorQuestion ? 'proctor' : 'patient';

    let systemPrompt = '';

    if (responder === 'patient') {
      systemPrompt = "You are playing the role of a 62-year-old male experiencing chest pain at a public park. Respond realistically as the patient, based only on symptoms, history, or how you feel.";
    } else {
      systemPrompt = "You are acting as a certified NREMT Proctor for an EMT Basic exam. You are not the patient. Only respond with scene information, vitals, physical findings, or acknowledge procedures. If asked something the patient would know, say 'Refer to the patient.'";
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

    return {
      statusCode: 200,
      body: JSON.stringify({ reply: aiReply })  // unified reply key
    };

  } catch (error) {
    console.error('Chat function error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to generate reply.' })
    };
  }
};
