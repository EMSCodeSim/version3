import OpenAI from 'openai';
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function handler(event) {
  try {
    const { audio } = JSON.parse(event.body);

    if (!audio) {
      return { statusCode: 400, body: JSON.stringify({ error: "No audio data received." }) };
    }

    // Decode base64 to buffer
    const buffer = Buffer.from(audio, 'base64');

    // Create file from buffer
    const file = await openai.files.create({
      file: buffer,
      purpose: "transcription",
      filename: "handoff.webm"
    });

    // Transcribe with whisper-1
    const transcript = await openai.audio.transcriptions.create({
      file: file,
      model: "whisper-1",
      response_format: "text"
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ transcript })
    };
  } catch (err) {
    console.error("Whisper error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Transcription failed", details: err.message })
    };
  }
}
