// ========= Speak Text with Real TTS-1 Voices (Randomize Patient) =========
async function speakTextTTS(text, role) {
  const voice = role === 'patient' ? 'fable' : 'shimmer'; // fable for patients, shimmer for proctor

  const response = await fetch('/.netlify/functions/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: text, voice: voice })
  });

  if (!response.ok) {
    console.error('TTS API Error');
    return;
  }

  const arrayBuffer = await response.arrayBuffer();
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  const source = audioContext.createBufferSource();
  source.buffer = audioBuffer;

  // Create a playback rate randomizer for patients
  if (role === 'patient') {
    // Random speed: between 0.95x and 1.05x (small realistic changes)
    source.playbackRate.value = Math.random() * (1.05 - 0.95) + 0.95;
  } else {
    // Proctor voice stays steady
    source.playbackRate.value = 1.0;
  }

  source.connect(audioContext.destination);
  source.start(0);
}
