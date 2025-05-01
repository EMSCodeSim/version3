// app.js (updated to reconnect working TTS)

async function speak(text, speaker = "patient") {
  console.log("[TTS] Speaking as:", speaker, "→", text);

  try {
    const res = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, speaker })
    });

    const { audio } = await res.json();
    if (!audio) throw new Error("No audio returned from TTS");

    const audioBlob = new Blob([
      Uint8Array.from(atob(audio), c => c.charCodeAt(0))
    ], { type: "audio/mpeg" });

    const audioUrl = URL.createObjectURL(audioBlob);
    const player = new Audio(audioUrl);
    player.play();
  } catch (err) {
    console.error("[TTS Error]", err);
  }
}

// Usage example after AI response:
// speak(responseText, "proctor");
// speak(responseText, "patient");

// Insert this function in your chatbot handler when responding to user input
// based on whether the message is from proctor or patient.

