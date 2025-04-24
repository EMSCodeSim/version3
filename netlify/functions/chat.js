const { Configuration, OpenAIApi } = require("openai");

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY
});
const openai = new OpenAIApi(configuration);

exports.handler = async (event) => {
  const { message } = JSON.parse(event.body);

  try {
    const completion = await openai.createChatCompletion({
      model: "gpt-4",
      messages: [
        { role: "system", content: "You are a simulated EMS patient. Only respond as a patient in a medical scenario." },
        { role: "user", content: message }
      ]
    });

    const reply = completion.data.choices[0].message.content;
    return {
      statusCode: 200,
      body: JSON.stringify({ reply })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ reply: "Error generating patient response." })
    };
  }
};
