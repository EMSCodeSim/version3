// mic.js

export async function comboMic() {
  // Check browser STT (SpeechRecognition API)
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SpeechRecognition) {
    // Fast browser mic
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.continuous = false;

    recognition.onstart = () => {
      document.getElementById('mic-button').style.backgroundColor = 'red';
    };
    recognition.onend = () => {
      document.getElementById('mic-button').style.backgroundColor = '';
    };
    recognition.onerror = (event) => {
      document.getElementById('mic-button').style.backgroundColor = '';
      // On error, fallback to Whisper
      startWhisperFallback();
    };
    recognition.onresult = (event) => {
      document.getElementById('mic-button').style.backgroundColor = '';
      const transcript = event.results[0][0].transcript;
      const input = document.getElementById('user-input');
      input.value = transcript;
      document.getElementById('send-button').click();
    };

    recognition.start();
    return;
  }

  // Fallback: Whisper (if browser STT unsupported)
  startWhisperFallback();
}

export function startWhisperFallback() {
  // Same as before, but factored for fallback use
  if (!navigator.mediaDevices || !window.MediaRecorder) {
    alert("🎤 Recording not supported. Please use a supported browser or device.");
    return;
  }
  let chunks = [];
  let streamRef;

  navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
    streamRef = stream;
    const recorder = new MediaRecorder(stream);
    recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
    recorder.onstop = async () => {
      document.getElementById('mic-button').style.backgroundColor = '';
      const blob = new Blob(chunks, { type: 'audio/webm' });
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Audio = reader.result.split(',')[1];
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
        }
        if (transcript) {
          const input = document.getElementById('user-input');
          input.value = transcript;
          document.getElementById('send-button').click();
        } else {
          alert("Sorry, couldn't understand your audio.");
        }
      };
      reader.readAsDataURL(blob);
      if (streamRef) streamRef.getTracks().forEach(track => track.stop());
    };
    chunks = [];
    recorder.start();
    document.getElementById('mic-button').style.backgroundColor = 'red';
    setTimeout(() => { if (recorder.state === "recording") recorder.stop(); }, 6000);
  }).catch(() => {
    alert("🎤 Microphone access denied.");
  });
}
