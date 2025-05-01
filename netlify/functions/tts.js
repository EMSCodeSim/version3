const fetch = require('node-fetch');

exports.handler = async (event) => {
  let text, speaker;

  // Safely parse request body
  try {
    const body = JSON.parse(event.body || '{}');
    text = body.text || "Hello, this is a test message.";
    speaker = body.speaker || "patient";
    console.log("Incoming TTS Request:", { text, speaker });
  } catch (err) {
    console.error("TTS JSON parse error:", err);
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Invalid JSON input" })
    };
  }

  const voice = speaker === "proctor" ? "shimmer" : "onyx";
  const speed = speaker === "patient" ? 1.3 : 1.1; // Speed up patient voice

  try {
    const response = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "tts-1",
        input: text,
        voice: voice,
        speed: speed,
        response_format: "mp3"
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("OpenAI TTS API Error:", errText);
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: "TTS API error", detail: errText })
      };
    }

    const audioBuffer = await response.arrayBuffer();
    const base64Audio = Buffer.from(audioBuffer).toString('base64');

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify({ audio: base64Audio }),
      isBase64Encoded: false
    };
  } catch (err) {
    console.error("TTS Handler Exception:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal server error", detail: err.message })
    };
  }
};

