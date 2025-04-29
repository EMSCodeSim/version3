const { Configuration, OpenAIApi } = require("openai");

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY
});

const openai = new OpenAIApi(configuration);

exports.handler = async function(event, context) {
  try {
    const body = JSON.parse(event.body || '{}');
    const prompt = body.prompt || "";

    const gptResponse = await openai.createChatCompletion({
      model: "gpt-4",
      messages: [
        { role: "system", content: "You are simulating an EMS patient. Respond briefly and realistically based on provided patient info." },
        { role: "user", content: prompt }
      ],
      max_tokens: 200,
      temperature: 0.7
    });

    const reply = gptResponse.data.choices[0].message.content;
    return {
      statusCode: 200,
      body: JSON.stringify({ reply })
    };

  } catch (err) {
    console.error("GPT Error:", err.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ reply: "GPT error: " + err.message })
    };
  }
};
