document.addEventListener("DOMContentLoaded", () => {
  const startBtn = document.getElementById("startBtn");
  const endBtn = document.getElementById("endBtn");
  const display = document.getElementById("scenarioDisplay");

  startBtn.addEventListener("click", () => {
    fetch("/scenarios/chest_pain_002/dispatch.txt")
      .then(response => {
        if (!response.ok) {
          throw new Error("Dispatch file not found.");
        }
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

  const userInput = document.getElementById("userInput");
  const sendBtn = document.getElementById("sendBtn");

  sendBtn.addEventListener("click", handleUserInput);

  userInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      handleUserInput();
    }
  });

  function handleUserInput() {
    const text = userInput.value.trim();
    if (text === "") return;

    const bubble = document.createElement("p");
    bubble.textContent = `You: ${text}`;
    display.appendChild(bubble);

    userInput.value = "";
  }
});
