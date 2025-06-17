// generate_vector_db_batch.js

const fs = require('fs');
const { Configuration, OpenAIApi } = require('openai');

// CONFIG
const INPUT_FILE = 'hardcodedResponses.json';  // Source file with your questions
const OUTPUT_FILE = 'vector-db.json';          // Where embeddings will be saved
const BATCH_SIZE = 100;                        // 2048 max for OpenAI; 100 is safe for most users

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

// Normalize question for dedupe
const normalize = q => (q || '').replace(/\s+/g, ' ').trim().toLowerCase();

async function main() {
  // 1. Load and dedupe questions
  const file = fs.readFileSync(INPUT_FILE, 'utf8');
  let items = [];
  try {
    const parsed = JSON.parse(file);
    if (Array.isArray(parsed)) {
      items = parsed;
    } else {
      items = Object.values(parsed);
    }
  } catch (err) {
    console.error('Failed to parse input file:', err);
    process.exit(1);
  }

  // Deduplicate
  const seen = new Set();
  const deduped = [];
  for (let item of items) {
    const nq = normalize(item.question);
    if (nq && !seen.has(nq)) {
      seen.add(nq);
      deduped.push(item);
    }
  }

  // 2. Prepare for batch processing
  const result = [];
  for (let i = 0; i < deduped.length; i += BATCH_SIZE) {
    const batch = deduped.slice(i, i + BATCH_SIZE);
    const batchQuestions = batch.map(x => x.question || "");
    process.stdout.write(`Embedding batch ${i + 1}-${i + batch.length} of ${deduped.length}... `);
    try {
      const resp = await openai.createEmbedding({
        model: "text-embedding-3-small",
        input: batchQuestions
      });
      const embeddings = resp.data.data.map(e => e.embedding);
      for (let j = 0; j < batch.length; ++j) {
        const entry = { ...batch[j], embedding: embeddings[j] };
        result.push(entry);
      }
      console.log("OK");
    } catch (err) {
      console.error("\nBatch embedding failed:", err);
      // Optionally add failed batch without embedding
      for (let j = 0; j < batch.length; ++j) {
        result.push({ ...batch[j], embedding: [] });
      }
    }
  }

  // 3. Save results
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(result, null, 2));
  console.log(`✅ Saved ${result.length} entries with embeddings to ${OUTPUT_FILE}`);
}

main();
