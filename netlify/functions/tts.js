// /netlify/functions/tts.js

const fetch = require("node-fetch");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const CACHE_DIR = "/tmp/tts_cache";
const TTS_LIMIT = 4096; // OpenAI's max input length

// Ensure cache directory exists (Netlify /tmp is writable)
if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR);

exports.handler = async function(event) {
  try {
    // Parse request body
    const { text, speaker } = JSON.parse(event.body || "{}");

    // Validate speaker/voice
    let voice;
    if (speaker === "proctor") voice = "shimmer";
    else if (speaker === "patient") voice = "onyx";
    else voice = "onyx"; // Default/fallback

    // Validate input
    if (!text || typeof text !== "string" || !text.trim()) {
      return error(400, "Missing or invalid text.");
    }
    if (text.length > TTS_LIMIT) {
      return error(400, `Text too long for TTS (limit: ${TTS_LIMIT} chars).`);
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return error(500, "Missing OpenAI API key.");

    // --- Caching ---
    const hash = crypto.createHash("sha256").update(text + "|" + voice).digest("hex");
    const cachePath = path.join(CACHE_DIR, `${hash}.mp3`);

    // Serve from cache if available
    if (fs.existsSync(cachePath)) {
      const base64Audio = fs.readFileSync(cachePath, "base64");
      return ok({ audio: base64Audio, cached: true });
    }

    // --- Call OpenAI TTS API (with retry) ---
    let response, audioBuffer;
    for (let attempt = 0; attempt < 2; attempt++) {
      response = await fetch("https://api.openai.com/v1/audio/speech", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "tts-1",
          input: text,
          voice,
          response_format: "mp3"
        })
      });

      if (response.ok) {
        audioBuffer = await response.arrayBuffer();
        break;
      } else if (attempt === 1) {
        const errorText = await response.text();
        console.error("TTS API error:", errorText);
        return error(502, "OpenAI API error", errorText);
      }
    }

    // Save
