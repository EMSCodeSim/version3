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

    const OPENAI_API_KEY = process.env.OPENAI_API_KEY; // Be sure this is set on Netlify!

    // Randomly decide: patient or proctor
    const responder = Math.random() < 0.8 ? 'patient' : 'proctor'; 
    // 80% chance patient, 20% chance proctor (feel free to adjust)

    // Set system prompt based on responder
    let systemPrompt = '';

    if (responder === 'patient') {
      systemPrompt = "You are playing the role of a 62-year-old male experiencing chest pain. Respond realistically as the patient.";
    } else {
      systemPrompt = "You are acting as a Proctor for an EMT exam. Only answer factual information (like vital signs, scene info) if appropriate. Otherwise say 'No additional information.'";
    }

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',  // Or gpt-4 if you have access
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

    if (responder === 'patient') {
      return {
        statusCode: 200,
        body: JSON.stringify({ patientReply: aiReply })
      };
    } else {
      return {
        statusCode: 200,
        body: JSON.stringify({ proctorReply: aiReply })
      };
    }

  } catch (error) {
    console.error('Chat function error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to generate reply.' })
    };
  }
};
