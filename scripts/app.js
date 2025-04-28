document.addEventListener("DOMContentLoaded", () => {
  const startBtn = document.getElementById("startBtn");
  const endBtn = document.getElementById("endBtn");
  const display = document.getElementById("scenarioDisplay");
  const userInput = document.getElementById("userInput");
  const sendBtn = document.getElementById("sendBtn");
  const adminBtn = document.getElementById("adminBtn");

  let patientInfo = "";
  let hardcodedAnswers = [];
  let currentScenario = "chest_pain_002";  // ✅ Set your current scenario folder name

  startBtn.addEventListener("click", () => {
    fetch(`/scenarios/${currentScenario}/dispatch.txt`)
      .then(response => response.text())
      .then(dispatchData => {
        display.innerHTML = `<strong>Dispatch:</strong> ${dispatchData}`;

        // ✅ After dispatch, add the scene image
        const sceneImage = document.createElement("img");
        sceneImage.src = `/scenarios/${currentScenario}/scene1.png`;
        sceneImage.alt = "Scene Image";
        sceneImage.style.maxWidth = "100%";
        sceneImage.style.marginTop = "15px";

        display.appendChild(sceneImage);

        return fetch(`/scenarios/${currentScenario}/patient.txt`);
      })
      .then(response => response.text())
      .then(patientData => {
        patientInfo = patientData;
        console.log("Loaded patient info:", patientInfo);

        return fetch(`/scenarios/${currentScenario}/chat_log.json`);
      })
      .then(response => response.json())
      .then(chatLogData => {
        hardcodedAnswers = chatLogData;
        console.log("Loaded scenario-specific hardcoded answers:", hardcodedAnswers);
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

  adminBtn.addEventListener("click", () => {
    window.location.href = "/admin.html"; // ✅ Go to admin panel
  });

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

  function findHardcodedAnswer(text, role) {
    text = text.toLowerCase();
    const match = hardcodedAnswers.find(entry => 
      entry.userQuestion.toLowerCase() === text && entry.role === role
    );
    return match ? match.aiResponse : null;
  }

  function handleUserInput() {
    const text = userInput.value.trim();
    if (!text) return;

    const userBubble = document.createElement("p");
    userBubble.textContent = `You: ${text}`;
    display.appendChild(userBubble);
    userInput.value = "";

    const role = isProctorQuestion(text) ? "proctor" : "patient";

    const hardcodedResponse = findHardcodedAnswer(text, role);

    if (hardcodedResponse) {
      console.log("Hardcoded response found:", hardcodedResponse);
      const responseBubble = document.createElement("p");
      responseBubble.textContent = `${role === "proctor" ? "Proctor" : "Patient"}: ${hardcodedResponse}`;
      display.appendChild(responseBubble);
    } else {
      console.log("No hardcoded response. Sending to GPT-4 Turbo...");
      const payload = {
        message: text,
        patientInfo: patientInfo,
        role: role
      };

      fetch("/.netlify/functions/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
        .then(res => res.json())
        .then(data => {
          const responseBubble = document.createElement("p");
          responseBubble.textContent = `${role === "proctor" ? "Proctor" : "Patient"}: ${data.reply}`;
          display.appendChild(responseBubble);
        })
        .catch(err => {
          console.error("Fetch error:", err);
          const errorBubble = document.createElement("p");
          errorBubble.textContent = "Error getting response.";
          display.appendChild(errorBubble);
        });
    }
  }
});
