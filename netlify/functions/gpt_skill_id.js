const { OpenAI } = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SKILL_IDS = [
  "sceneSafety",
  "primaryAssessment",
  "vitalsBP",
  "vitalsPulse",
  "vitalsRespirations",
  "historySAMPLE",
  "secondaryAssessment",
  "reassessment",
  "administerOxygen",
  "administerGlucose",
  "immobilization",
  "controlBleeding",
  "airwayManagement",
  // ...add all official skill sheet IDs here!
];

exports.handler = async (event) => {
  try {
    const { question, response, tags } = JSON.parse(event.body || "{}");
    if (!question && !response) {
      return { statusCode: 400, body: JSON.stringify({ error: "Missing question/response" }) };
    }

    // Compose a robust prompt
    const prompt = `
You are an expert EMS educator. Assign the single most appropriate NREMT Medical Assessment Skill Sheet line item (Skill Sheet ID) for the following record.
Only return one Skill Sheet ID from this list:
${SKILL_IDS.join(", ")}

Question: ${question || "(none)"}
Response: ${response || "(none)"}
Tags: ${Array.isArray(tags) ? tags.join(", ") : "(none)"}

Which is the best-matching Skill Sheet ID from the list above? Respond with only the ID.
`;

    const gptRes = await openai.chat.completions.create({
      model: "gpt-4o", // Use "gpt-3.5-turbo" for cheaper/fast tagging, or "gpt-4o" for accuracy
      messages: [{ role: "user", content: prompt }],
      max_tokens: 30,
      temperature: 0,
    });

    const raw = gptRes.choices[0].message.content.trim();
    // Extract the Skill Sheet ID only (should match one of the official list)
    const skillSheetID = SKILL_IDS.find(
      (id) => raw.toLowerCase().includes(id.toLowerCase())
    ) || raw; // fallback: just send whatever model gave

    return {
      statusCode: 200,
      body: JSON.stringify({ skillSheetID }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
