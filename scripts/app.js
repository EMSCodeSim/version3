document.addEventListener("DOMContentLoaded", () => {
  const startBtn = document.getElementById("startBtn");
  const endBtn = document.getElementById("endBtn");
  const display = document.getElementById("scenarioDisplay");
  const userInput = document.getElementById("userInput");
  const sendBtn = document.getElementById("sendBtn");

  let patientInfo = ""; // store hidden patient info here

  startBtn.addEventListener("click", () => {
    fetch("/scenarios/chest_pain_002/dispatch.txt")
      .then(response => {
        if (!response.ok) throw new Error("Dispatch file not found.");
        return response.text();
      })
      .then(dispatchData => {
        display.innerHTML = `<strong>Dispatch:</strong> ${dispatchData}`;
        // After dispatch loads, also load patient file
        return fetch("/scenarios/chest_pain_002/patient.txt");
      })
      .then(response => {
        if (!response.ok) throw new Error("Patient file not found.");
        return response.text();
      })
      .then(patientData => {
        patientInfo = patientData; // store it for use when sending to AI
        console.log("Loaded patient info:", patientInfo); // Debug
      })
      .catch(error => {
        console.error("Loading error:", error);
        display.innerHTML = `<span style='color:red;'>Error loading scenario: ${error.message}</span>`;
      });
  });

  endBtn.addEventListener("click", () => {
    display.innerHTML = "<p>Scenario ended. Thank you for participating.</p>";
  });

  sendBtn.addEventListener("click", handleUserInput);
  userInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") handleUserInput();
  });

  function handleUserInput() {
    const text = userInput.value.trim();
    if (!text) return;

    const userBubble = document.createElement("p");
    userBubble.textContent = `You: ${text}`;
    display.appendChild(userBubble);
    userInput.value = "";

    fetch("/.netlify/functions/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        message: text, 
        patientInfo: patientInfo // Pass patient data to backend
      })
    })
      .then(res => res.json())
      .then(data => {
        const responseBubble = document.createElement("p");
        responseBubble.textContent = `Patient: ${data.reply}`;
        display.appendChild(responseBubble);
      })
      .catch(err => {
        console.error("Fetch error:", err);
        const errorBubble = document.createElement("p");
        errorBubble.textContent = "Error getting response from patient.";
        display.appendChild(errorBubble);
      });
  }
});
