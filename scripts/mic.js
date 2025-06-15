// mic.js

export async function startWhisperMic() {
  if (!navigator.mediaDevices || !window.MediaRecorder) {
    alert("🎤 Voice recording not supported in this browser. Try updating your device.");
    return;
  }
  let stream;
  let recorder;
  let chunks = [];

  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (err) {
    alert("🎤 Microphone access denied.");
    return;
  }

  recorder = new MediaRecorder(stream);

  recorder.ondataavailable = e => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  recorder.onstop = async () => {
    // Turn chunks into audio blob
    const blob = new Blob(chunks, { type: 'audio/webm' });
    const reader = new FileReader();
    reader.onloadend = async () => {
      // Remove mic color state
      document.getElementById('mic-button').style.backgroundColor = '';

      // Convert audio to base64 (strip prefix)
      const base64Audio = reader.result.split(',')[1];

      // Send audio to your Netlify Whisper function
      let transcript = "";
      try {
        const resp = await fetch('/.netlify/functions/wisper_transcrine', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ audio: base64Audio })
        });
        const data = await resp.json();
        transcript = data.transcript || "";
      } catch (e) {
        alert("AI transcription failed.");
        return;
      }

      // Put result in input box and auto-send
      if (transcript) {
        const input = document.getElementById('user-input');
        input.value = transcript;
        document.getElementById('send-button').click();
      } else {
        alert("Sorry, couldn't understand your audio.");
      }
    };
    reader.readAsDataURL(blob);
    // Release mic stream (privacy)
    stream.getTracks().forEach(track => track.stop());
  };

  // Start recording for up to 7 seconds, or until mic is clicked again (for stop)
  chunks = [];
  recorder.start();
  document.getElementById('mic-button').style.backgroundColor = 'red';
  setTimeout(() => {
    if (recorder.state === "recording") recorder.stop();
  }, 7000); // Max 7s, adjust as needed
}
