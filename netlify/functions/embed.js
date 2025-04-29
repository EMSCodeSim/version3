const { Configuration, OpenAIApi } = require("openai");

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

exports.handler = async function (event, context) {
  try {
    const { text } = JSON.parse(event.body);

    const response = await openai.createEmbedding({
      model: "text-embedding-ada-002",
      input: text
    });

    const embedding = response.data.data[0].embedding;
    return {
      statusCode: 200,
      body: JSON.stringify({ embedding })
    };
  } catch (err) {
    console.error("Embedding Error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to generate embedding" })
    };
  }
};
