const fetch = require('node-fetch');

exports.handler = async function(event) {
  try {
    const { text, speaker } = JSON.parse(event.body);
    const voice = speaker === 'proctor' ? 'shimmer' : 'onyx'; // adjust as needed

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "No text provided" })
      };
    }

    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: text,
        voice: voice,
        response_format: 'base64'
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI TTS API Error:", errorText);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "TTS API call failed", details: errorText })
      };
    }

    const result = await response.json();
    return {
      statusCode: 200,
      body: JSON.stringify({ audio: result.audio })
    };

  } catch (err) {
    console.error("Unhandled error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal server error", details: err.message })
    };
  }
};
