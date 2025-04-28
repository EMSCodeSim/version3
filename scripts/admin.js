async function approveUnknown(index) {
  const questionInput = document.getElementById(`pending-question-${index}`).value.trim();
  const responseInput = document.getElementById(`pending-response-${index}`).value.trim();
  const roleInput = document.getElementById(`pending-role-${index}`).value;
  const voiceInput = document.getElementById(`pending-voice-${index}`).value;
  const triggerType = document.getElementById(`pending-trigger-type-${index}`).value;
  const triggerFile = document.getElementById(`trigger-file-pending-${index}`).files[0];

  if (!questionInput || !responseInput) {
    alert('Please fill out question and AI response.');
    return;
  }

  // Generate filename for audio
  const filename = `response_${Date.now()}.mp3`;

  // Save TTS audio
  try {
    await fetch('/.netlify/functions/saveTTS', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: responseInput,
        voice: voiceInput,
        filename: filename
      })
    });
  } catch (error) {
    console.error('TTS save error:', error);
    alert('Audio save failed.');
    return;
  }

  // Add to hardcodedResponses
  hardcodedResponses.push({
    userQuestion: questionInput,
    aiResponse: responseInput,
    role: roleInput,
    voice: voiceInput,
    audioFile: `./audio/${filename}`
  });
  hardcodesRef.set(hardcodedResponses);

  // Add trigger if needed
  if (triggerType && triggerFile) {
    const reader = new FileReader();
    reader.onload = function(event) {
      triggers.push({
        pattern: questionInput,
        type: triggerType,
        filename: triggerFile.name,
        fileData: event.target.result
      });
      triggersRef.set(triggers);
    };
    reader.readAsDataURL(triggerFile);
  }

  // Remove from unknownQuestions
  unknownQuestions.splice(index, 1);
  unknownsRef.set(unknownQuestions);

  displayPendingUnknowns();
  displayApprovedHardcoded();
}
