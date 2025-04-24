function handleUserInput() {
  const text = userInput.value.trim();
  if (text === "") return;

  const bubble = document.createElement("p");
  bubble.textContent = `You: ${text}`;
  display.appendChild(bubble);
  userInput.value = "";

  fetch("/.netlify/functions/chat", {
    method: "POST",
    body: JSON.stringify({ message: text }),
    headers: { "Content-Type": "application/json" }
  })
    .then(res => res.json())
    .then(data => {
      const responseBubble = document.createElement("p");
      responseBubble.textContent = `Patient: ${data.reply}`;
      display.appendChild(responseBubble);
    })
    .catch(err => {
      const errorBubble = document.createElement("p");
      errorBubble.textContent = "Error getting response from patient.";
      display.appendChild(errorBubble);
    });
}
