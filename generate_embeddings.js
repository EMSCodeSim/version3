// Run this locally with: node generate_embeddings.js
const fs = require('fs');
const { Configuration, OpenAIApi } = require('openai');

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY
});
const openai = new OpenAIApi(configuration);

const questions = [
  {
    question: "do you have chest pain?",
    answer: "Yes, it's a heavy pressure right here in my chest.",
    role: "patient"
  },
  {
    question: "what is the blood pressure",
    answer: "Blood pressure is 130/84 mmHg.",
    role: "proctor"
  },
  {
    question: "how many patients",
    answer: "You see only one patient.",
    role: "proctor"
  }
];

async function generateEmbeddings() {
  for (const item of questions) {
    const response = await openai.createEmbedding({
      model: "text-embedding-ada-002",
      input: item.question
    });
    item.embedding = response.data.data[0].embedding;
  }

  fs.writeFileSync('vector-db.json', JSON.stringify(questions, null, 2));
  console.log("✅ vector-db.json created with embeddings.");
}

generateEmbeddings();
