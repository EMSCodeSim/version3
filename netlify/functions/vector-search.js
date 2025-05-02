// Netlify Function: vector-search.js
// Updated vector sensitivity threshold to 0.7

const fetch = require('node-fetch');
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const embeddingModel = "text-embedding-ada-002";
const storedEmbeddings = require("./vector-db.json"); // your local embedding JSON

function cosineSimilarity(vecA, vecB) {
  const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const normA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const normB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  return dotProduct / (normA * normB);
}

exports.handler = async (event) => {
  try {
    const { query } = JSON.parse(event.body);
    const embedRes = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        input: query,
        model: embeddingModel
      })
    });

    const json = await embedRes.json();
    const queryEmbedding = json.data[0].embedding;

    let bestMatch = null;
    let bestScore = 0;
    const threshold = 0.7; // updated sensitivity level

    for (const item of storedEmbeddings) {
      const sim = cosineSimilarity(queryEmbedding, item.embedding);
      if (sim > bestScore && sim > threshold) {
        bestScore = sim;
        bestMatch = item.text;
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ match: bestMatch })
    };

  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
