// handoff_inline.js
// Inline handoff report capture, grading, and feedback display
// Call window.startHandoffInline() to activate

// 1. Activate handoff mode
window.startHandoffInline = function () {
  if (typeof window.appendChatBubble === "function") {
    window.appendChatBubble(
      "system",
      "<b>Give your handoff report:</b>\nType and press Send, or use 🎤."
    );
  }
  window.handoffActive = true;
  // Optionally, focus input:
  var inp = document.getElementById("user-input");
  if (inp) inp.focus();
};

// 2. Handle handoff submission (call from app.js send handler)
window.handleHandoffSubmission = async function (inputText) {
  // Replace this stub with your own grading function or OpenAI call
  let feedback = await mockGradeHandoff(inputText);

  if (typeof window.appendChatBubble === "function") {
    window.appendChatBubble(
      "system",
      "<b>Handoff Report Grading:</b><br>" + feedback
    );
  }
  window.handoffActive = false;
};

// 3. Sample/mock grading function (replace with your own logic)
async function mockGradeHandoff(text) {
  if (!text || text.length < 8) {
    return `<span style='color:red;'>Please give a complete handoff report.</span>`;
  }
  // Simulate grading delay
  await new Promise((res) => setTimeout(res, 800));
  return `<span style='color:green;'>Nice job! Your report was received and would score 34/40.<br>Tip: Remember to include past medical history next time.</span>`;
}

// 4. Optionally: add a helper so app.js can trigger this logic
// In app.js:  
// if(window.handoffActive && typeof window.handleHandoffSubmission==="function") {
//   window.handleHandoffSubmission(userInput);
//   return;
// }

// And on button:
// if(typeof window.startHandoffInline==="function") window.startHandoffInline();
