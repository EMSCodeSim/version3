const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

exports.handler = async function(event, context) {
  try {
    const { message } = JSON.parse(event.body);

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

    const completion = await openai.completions.create({
      model: "gpt-3.5-turbo-instruct",
      prompt: prompt,
      max_tokens: 16,
      temperature: 0.1,
      stop: ["\n"]
    });

    const rephrased = completion.choices[0].text.trim();
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
