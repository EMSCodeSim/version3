// /netlify/functions/gpt_tagger.js
const { Configuration, OpenAIApi } = require("openai");
const fs = require("fs");
const path = require("path");

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

// Load medical_assessment.json NREMT skill categories (sync, only on cold start)
const categoriesFile = path.join(__dirname, "..", "..", "grading_templates", "medical_assessment.json");
const categories = JSON.parse(fs.readFileSync(categoriesFile, "utf-8"));
const categoryKeys = Object.keys(categories);
const keyLabelMap = {};
categoryKeys.forEach(k => { keyLabelMap[k] = categories[k].label; });

exports.handler = async (event) => {
  try {
    const { question, response } = JSON.parse(event.body);

    // SYSTEM PROMPT
    const systemPrompt = `
You are an EMS education expert. 
Given a question and response from a student, assign the correct NREMT Medical Assessment Skill Sheet *key* for grading.
Choose ONLY from this exact list (these are the official key names):

${categoryKeys.map(k => `${k}: ${categories[k].label}`).join("\n")}

Your answer MUST be a single key from the list above. If nothing fits, return 'None'.
Return a JSON object: { "scoreCategory": "KEY", "tags": ["..."], "criticalFail": true/false }
Tags are comma-separated keywords (if possible). criticalFail should be true only if this would be a critical failure on NREMT.

QUESTION: ${question}
RESPONSE: ${response}
    `.trim();

    // Call GPT (3.5 Turbo by default, upgrade to 4o if desired)
    const gptRes = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `QUESTION: ${question}\nRESPONSE: ${response}\n\nRespond only with the JSON.` },
      ],
      temperature: 0,
      max_tokens: 200,
    });

    // Parse model result
    let gptOut;
    try {
      gptOut = JSON.parse(gptRes.data.choices[0].message.content);
    } catch (err) {
      // Fallback if model responds with text and JSON
      const match = gptRes.data.choices[0].message.content.match(/\{[\s\S]*?\}/);
      gptOut = match ? JSON.parse(match[0]) : { scoreCategory: "None", tags: [], criticalFail: false };
    }

    // --- Fuzzy/fallback: Map labels to keys if needed
    let selectedKey = gptOut.scoreCategory;
    if (selectedKey && !categoryKeys.includes(selectedKey) && selectedKey !== "None") {
      // Try to map by label
      const keyFromLabel = categoryKeys.find(k =>
        keyLabelMap[k].toLowerCase() === selectedKey.toLowerCase() ||
        selectedKey.toLowerCase().includes(keyLabelMap[k].toLowerCase())
      );
      selectedKey = keyFromLabel || "None";
    }
    // Always validate
    if (!categoryKeys.includes(selectedKey)) selectedKey = "None";

    // Tags fallback
    let tags = Array.isArray(gptOut.tags) ? gptOut.tags : [];
    if (typeof gptOut.tags === "string") tags = gptOut.tags.split(",").map(t => t.trim()).filter(Boolean);

    // criticalFail fallback
    let criticalFail = Boolean(gptOut.criticalFail);

    // Return
    return {
      statusCode: 200,
      body: JSON.stringify({
        scoreCategory: selectedKey,
        tags,
        criticalFail,
      }),
    };

  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
