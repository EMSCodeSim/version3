const fetch = require('node-fetch');

exports.handler = async (event, context) => {
  try {
    const { text, speaker } = JSON.parse(event.body);

    const voice = speaker === "proctor" ? "shimmer" : "onyx";

    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "tts-1",
        input: text,
        voice: voice,
        response_format: "mp3"
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI TTS error:", errorText);
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: "TTS API failed", detail: errorText })
      };
    }

    const audioBuffer = await response.arrayBuffer();
    const base64Audio = Buffer.from(audioBuffer).toString('base64');

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ audio: base64Audio }),
      isBase64Encoded: false
    };
  } catch (err) {
    console.error("TTS handler error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "TTS function error", detail: err.message })
    };
  }
};
