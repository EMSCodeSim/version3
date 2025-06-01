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
  "airwayManagement"
  // ...add all your official skill sheet IDs here!
];

exports.handler = async (event) => {
  try {
    const { question, response, tags } = JSON.parse(event.body || "{}");
    if (!question && !response) {
      return { statusCode: 400, body: JSON.stringify({ error: "Missing question/response" }) };
    }

    // Strict, clear prompt:
    const prompt = `
You are an expert EMS educator. Assign the single most appropriate NREMT Medical Assessment Skill Sheet line item (Skill Sheet ID) for the following record.
ONLY respond with ONE Skill Sheet ID exactly as written from this list:
${SKILL_IDS.join(", ")}

If none apply, reply ONLY with: none

Question: ${question || "(none)"}
Response: ${response || "(none)"}
Tags: ${Array.isArray(tags) ? tags.join(", ") : "(none)"}

Respond ONLY with a single Skill Sheet ID from the list above. Do not repeat the question. Do not explain your answer. No extra text. 
`;

    const gptRes = await openai.chat.completions.create({
      model: "gpt-4o", // or "gpt-3.5-turbo" for cheaper tagging
      messages: [{ role: "user", content: prompt }],
      max_tokens: 16,
      temperature: 0,
    });

    const raw = gptRes.choices[0].message.content.trim();

    // Strict post-processing: exact match only (case-insensitive)
    let skillSheetID = "none";
    for (const id of SKILL_IDS) {
      const regex = new RegExp(`^${id}$`, "i"); // must match whole string
      if (regex.test(raw)) {
        skillSheetID = id;
        break;
      }
    }
    // Also allow "none" as a response
    if (raw.toLowerCase() === "none") skillSheetID = "none";

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
