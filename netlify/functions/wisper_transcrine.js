import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function handler(event) {
  try {
    const { audio } = JSON.parse(event.body);

    if (!audio) {
      return { statusCode: 400, body: JSON.stringify({ error: "Missing audio" }) };
    }

    // Decode base64 to binary buffer
    const buffer = Buffer.from(audio, 'base64');

    // Write buffer to temporary file
    const tempFilePath = '/tmp/handoff.webm';
    fs.writeFileSync(tempFilePath, buffer);

    // Create readable stream from temp file
    const fileStream = fs.createReadStream(tempFilePath);

    // Transcribe using Whisper
    const transcript = await openai.audio.transcriptions.create({
      file: fileStream,
      model: "whisper-1",
      response_format: "text"
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ transcript })
    };
  } catch (error) {
    console.error("❌ Whisper Transcribe Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Transcription failed", message: error.message })
    };
  }
}
