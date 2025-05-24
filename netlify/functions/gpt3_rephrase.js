// netlify/functions/gpt3_rephrase.js

const { Configuration, OpenAIApi } = require("openai");

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

exports.handler = async function(event, context) {
  try {
    const { input } = JSON.parse(event.body);

    // The new, strict, minimal-action prompt:
    const prompt = `
Rewrite the following EMS instruction or question as the shortest, simplest possible command or phrase suitable for a checklist. Do not include names, context, or extra details—only the core action.

Example:
Input: "I would instruct my partner to take a blood pressure on the patient's left arm."
Output: "check blood pressure"

Input: "Tell the patient to sit up and take slow deep breaths."
Output: "coach breathing"

Input: "I'm going to apply high-flow oxygen to the patient."
Output: "apply oxygen"

Input: "${input}"
Output:
`;

    const response = await openai.createCompletion({
      model: "gpt-3.5-turbo-instruct",
      prompt: prompt,
      max_tokens: 20,
      temperature: 0.2,
      stop: ["\n"]
    });

    // Clean up output, return the result.
    const result = response.data.choices[0].text.trim().replace(/^["']|["']$/g, "");
    return {
      statusCode: 200,
      body: JSON.stringify({ result })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
