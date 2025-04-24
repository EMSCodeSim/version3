document.addEventListener("DOMContentLoaded", () => {
  const startBtn = document.getElementById("startBtn");
  const endBtn = document.getElementById("endBtn");
  const display = document.getElementById("scenarioDisplay");
  const userInput = document.getElementById("userInput");
  const sendBtn = document.getElementById("sendBtn");

  startBtn.addEventListener("click", () => {
    fetch("/scenarios/chest_pain_002/dispatch.txt")
      .then(response => {
        if (!response.ok) throw new Error("Dispatch file not found.");
        return response.text();
      })
      .then(data => {
        display.innerHTML = `<strong>Dispatch:</strong> ${data}`;
      })
      .catch(error => {
        display.innerHTML = `<span style='color:red;'>Error loading dispatch: ${error.message}</span>`;
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
      body: JSON.stringify({ message: text }),
      headers: { "Content-Type": "application/json" }
    })
      .then(res => res.json())
      .then(data => {
        console.log("AI Response:", data); // Debugging
        const responseBubble = document.createElement("p");
        responseBubble.textContent = `Patient: ${data.reply}`;
        display.appendChild(responseBubble);
      })
      .catch(err => {
        console.error("Fetch Error:", err);
        const errorBubble = document.createElement("p");
        errorBubble.textContent = "Error getting response from patient.";
        display.appendChild(errorBubble);
      });
  }
});
