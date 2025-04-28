const fetch = require('node-fetch');

exports.handler = async (event, context) => {
  const { text, voice } = JSON.parse(event.body);

  const apiKey = process.env.OPENAI_API_KEY; // Set this in Netlify Settings!

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
      'Content-Type': 'audio/mpeg',
      'Access-Control-Allow-Origin': '*'
    },
    body: Buffer.from(audioStream).toString('base64'),
    isBase64Encoded: true
  };
};
