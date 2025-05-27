const { OpenAI } = require("openai");
const openai = new OpenAI();

exports.handler = async (event) => {
  const { userInput } = JSON.parse(event.body);

  const systemPrompt = `
You are an EMS simulation assistant. A student may submit one sentence with multiple actions. Parse it into clear medical actions. For each, return:

- "actionText": plain English version of the action
- "tags": 1–3 keywords
- "skillSheetID": NREMT skill reference (or null if unknown)
- "scoreCategory": e.g., Vitals, Treatment, Assessment
- "points": 0–2 (but ignore for now)
- "criticalFail": true/false (but ignore for now)

Format output as a JSON array.
`;

  const response = await openai.chat.completions.create({
    model: "gpt-3.5-turbo-0125",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userInput }
    ]
  });

  return {
    statusCode: 200,
    body: response.choices[0].message.content
  };
};
