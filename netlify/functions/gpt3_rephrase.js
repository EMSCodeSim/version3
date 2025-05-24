const { Configuration, OpenAIApi } = require("openai");

// Use your OpenAI API Key
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

exports.handler = async function(event, context) {
  try {
    const { message } = JSON.parse(event.body);

    // Strict prompt for the shortest, checklist-style command:
    const prompt = `
Rewrite the following EMS instruction or question as the shortest, simplest command or checklist phrase. 
Use 2-4 words only. Remove any extra words, names, context, or details—return only the essential EMS action.

Examples:
Input: "I would instruct my partner to take a blood pressure on the patient's left arm."
Output: check blood pressure

Input: "Tell the patient to sit up and take slow deep breaths."
Output: coach breathing

Input: "I'm going to apply high-flow oxygen to the patient."
Output: apply oxygen

Input: "I want to put the patient on a monitor and check a 12-lead EKG."
Output: obtain 12-lead

Input: "${message}"
Output:
`;

    // Use GPT-3.5-turbo-instruct for best effect; fall back to text-davinci-003 if needed
    const response = await openai.createCompletion({
      model: "gpt-3.5-turbo-instruct", // Or use "text-davinci-003" if not available
      prompt: prompt,
      max_tokens: 16,
      temperature: 0.1,
      stop: ["\n"]
    });

    // Return in your expected structure { rephrased: ... }
    const rephrased = response.data.choices[0].text.trim();
    return {
      statusCode: 200,
      body: JSON.stringify({ rephrased })
    };

  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
