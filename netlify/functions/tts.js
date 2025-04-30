// netlify/functions/tts.js
const fetch = require('node-fetch');

exports.handler = async (event, context) => {
  const { text, speaker } = JSON.parse(event.body); // expects speaker: "proctor" or "patient"

  const apiKey = process.env.OPENAI_API_KEY;

  // Assign voice based on speaker type
  const voice = speaker === "proctor" ? "shimmer" : "onyx";

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

  const audioStream = await response.arrayBuffer();

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify({
      audio: Buffer.from(audioStream).toString('base64')
  },  
};
