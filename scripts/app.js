document.addEventListener("DOMContentLoaded", () => {
  const startBtn = document.getElementById("startBtn");
  const endBtn = document.getElementById("endBtn");
  const display = document.getElementById("scenarioDisplay");
  const userInput = document.getElementById("userInput");
  const sendBtn = document.getElementById("sendBtn");

  let patientInfo = "";

  startBtn.addEventListener("click", () => {
    fetch("/scenarios/chest_pain_002/dispatch.txt")
      .then(response => {
        if (!response.ok) throw new Error("Dispatch file not found.");
        return response.text();
      })
      .then(dispatchData => {
        display.innerHTML = `<strong>Dispatch:</strong> ${dispatchData}`;
        return fetch("/scenarios/chest_pain_002/patient.txt");
      })
      .then(response => {
        if (!response.ok) throw new Error("Patient file not found.");
        return response.text();
      })
      .then(patientData => {
        patientInfo = patientData;
        console.log("Loaded patient info:", patientInfo);
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

  function isProctorQuestion(text) {
    const proctorKeywords = [
      "blood pressure", "pulse", "respiratory rate", "lung sounds", "saO2", "blood sugar", "skin appearance",
      "scene safety", "number of patients", "pill bottles", "time of day", "outside temperature",
      "painful stimuli", "giving asa", "administer aspirin", "give oxygen", "place on monitor",
      "scene", "environment", "pill", "vial", "response to pain"
    ];
    return proctorKeywords.some(keyword => text.toLowerCase().includes(keyword));
  }

  function handleUserInput() {
    const text = userInput.value.trim();
    if (!text) return;

    const userBubble = document.createElement("p");
    userBubble.textContent = `You: ${text}`;
    display.appendChild(userBubble);
    userInput.value = "";

    const payload = {
      message: text,
      patientInfo: patientInfo,
      role: isProctorQuestion(text) ? "proctor" : "patient"
    };

    fetch("/.netlify/functions/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
      .then(res => res.json())
      .then(data => {
        const responseBubble = document.createElement("p");
        responseBubble.textContent = `${payload.role === "proctor" ? "Proctor" : "Patient"}: ${data.reply}`;
        display.appendChild(responseBubble);
      })
      .catch(err => {
        console.error("Fetch error:", err);
        const errorBubble = document.createElement("p");
        errorBubble.textContent = "Error getting response.";
        display.appendChild(errorBubble);
      });
  }
});
