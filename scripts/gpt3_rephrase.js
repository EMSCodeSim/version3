// gpt3_rephrase.js

export async function getRephrasedInput(userInput) {
  const apiKey = process.env.OPENAI_API_KEY;

  const payload = {
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "system",
        content: "You are a helpful assistant that rewrites messy, vague, or casual EMS trainee input into a clear, direct EMS-related question or command. Do not answer — only rephrase."
      },
      {
        role: "user",
        content: userInput
      }
    ],
    temperature: 0.2,
    max_tokens: 50
  };

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json();

  if (data.choices && data.choices.length > 0) {
    return data.choices[0].message.content.trim();
  } else {
    console.error("GPT-3.5 rephrase failed:", data);
    return userInput; // fallback to original input
  }
}
