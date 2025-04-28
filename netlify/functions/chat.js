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

    const OPENAI_API_KEY = process.env.OPENAI_API_KEY; // <-- Make sure this environment variable is set!

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',  // or gpt-4 if you have access
        messages: [
          { role: 'system', content: 'You are acting as a simulated EMS patient answering an EMT.' },
          { role: 'user', content: content }
        ],
        temperature: 0.5
      })
    });

    const openaiData = await openaiResponse.json();

    if (!openaiData.choices || openaiData.choices.length === 0) {
      throw new Error('No choices returned from OpenAI.');
    }

    const botReply = openaiData.choices[0].message.content.trim();

    return {
      statusCode: 200,
      body: JSON.stringify({ botReply })
    };

  } catch (error) {
    console.error('Chat function error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to generate reply.' })
    };
  }
};
