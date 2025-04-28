// /.netlify/functions/saveTTS.js
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

exports.handler = async (event, context) => {
  try {
    const { text, voice, filename } = JSON.parse(event.body);

    if (!text || !voice || !filename) {
      return { statusCode: 400, body: 'Missing required fields.' };
    }

    const apiKey = process.env.OPENAI_API_KEY;

    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
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
      console.error('OpenAI Error:', errorText);
      return { statusCode: 500, body: 'Error generating audio.' };
    }

    const audioBuffer = await response.buffer();

    // Save into /audio folder
    const audioPath = path.join(__dirname, '../../audio', filename);
    fs.writeFileSync(audioPath, audioBuffer);

    console.log('Audio saved at:', audioPath);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Audio saved.', path: `/audio/${filename}` })
    };
  } catch (error) {
    console.error('SaveTTS error:', error);
    return { statusCode: 500, body: 'Server error.' };
  }
};
