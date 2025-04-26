const { Configuration, OpenAIApi } = require("openai");

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

exports.handler = async (event) => {
  try {
    const { message } = JSON.parse(event.body);

    const completion = await openai.createChatCompletion({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are a simulated EMS patient. Answer only as the patient during a medical emergency. Respond briefly and naturally.",
        },
        { role: "user", content: message },
      ],
    });

    const reply = completion.data.choices[0]?.message?.content;

    console.log("GPT Reply:", reply);

    return {
      statusCode: 200,
      body: JSON.stringify({ reply: reply || "No response from AI." }),
    };

  } catch (error) {
    console.error("Function Error:", error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ reply: "Server error while generating response." }),
    };
  }
};
