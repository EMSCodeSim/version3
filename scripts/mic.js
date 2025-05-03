// mic.js
let recognition;
let micActive = false;

export function startVoiceRecognition() {
  if (!('webkitSpeechRecognition' in window)) {
    alert("Speech recognition not supported in this browser.");
    return;
  }

  recognition = new webkitSpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = 'en-US';

  recognition.onstart = () => {
    micActive = true;
    document.getElementById('mic-button').style.backgroundColor = 'red';
    console.log("🎤 Mic listening...");
  };

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    document.getElementById('user-input').value = transcript;
    document.getElementById('send-button').click();
  };

  recognition.onend = () => {
    micActive = false;
    document.getElementById('mic-button').style.backgroundColor = '';
    console.log("🎤 Mic stopped.");
  };

  recognition.onerror = (event) => {
    micActive = false;
    document.getElementById('mic-button').style.backgroundColor = '';
    console.error("Mic error:", event.error);
  };

  recognition.start();
}

export function stopVoiceRecognition() {
  if (recognition) {
    recognition.stop();
    recognition = null;
  }
}
