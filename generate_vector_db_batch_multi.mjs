// generate_vector_db_batch_multi.mjs

import fs from 'fs';
import OpenAI from 'openai';

// ---- EDIT THESE TO MATCH YOUR PROJECT ----
const INPUT_FILES = [
  'scenarios/chest_pain_002/ems_database_part1.json',
  'scenarios/chest_pain_002/ems_database_part2.json',
  'scenarios/chest_pain_002/ems_database_part3.json'
];
const OUTPUT_FILE = 'vector-db.json';
const BATCH_SIZE = 100; // 2048 max for OpenAI, 100 is safe and efficient

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const normalize = q => (q || '').replace(/\s+/g, ' ').trim().toLowerCase();

async function main() {
  // 1. Load and combine items from all input files
  let items = [];
  for (const file of INPUT_FILES) {
    if (!fs.existsSync(file)) {
      console.warn(`⚠️ File not found: ${file} (skipping)`);
      continue;
    }
    const raw = fs.readFileSync(file, 'utf8');
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        items = items.concat(parsed);
      } else {
        items = items.concat(Object.values(parsed));
      }
    } catch (err) {
      console.error(`Failed to parse ${file}:`, err);
    }
  }

  if (items.length === 0) {
    console.error("❌ No items loaded from input files. Exiting.");
    process.exit(1);
  }

  // 2. Deduplicate by normalized question
  const seen = new Set();
  const deduped = [];
  for (let item of items) {
    const nq = normalize(item.question);
    if (nq && !seen.has(nq)) {
      seen.add(nq);
      deduped.push(item);
    }
  }
  console.log(`Loaded ${items.length} items, deduplicated to ${deduped.length} unique questions.`);

  // 3. Generate embeddings in batches
  const result = [];
  for (let i = 0; i < deduped.length; i += BATCH_SIZE) {
    const batch = deduped.slice(i, i + BATCH_SIZE);
    const batchQuestions = batch.map(x => x.question || "");
    process.stdout.write(`Embedding batch ${i + 1}-${i + batch.length} of ${deduped.length}... `);
    try {
      const resp = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: batchQuestions
      });
      const embeddings = resp.data.map(e => e.embedding);
      for (let j = 0; j < batch.length; ++j) {
        const entry = { ...batch[j], embedding: embeddings[j] };
        result.push(entry);
      }
      console.log("OK");
    } catch (err) {
      console.error("\nBatch embedding failed:", err.message);
      for (let j = 0; j < batch.length; ++j) {
        result.push({ ...batch[j], embedding: [] });
      }
    }
  }

  // 4. Save results
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(result, null, 2));
  console.log(`✅ Saved ${result.length} entries with embeddings to ${OUTPUT_FILE}`);
}

main();
