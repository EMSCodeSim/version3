// .netlify/functions/embed.js
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async (req, res) => {
  try {
    const { input } = req.body;
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input
    });
    res.json({ embedding: response.data[0].embedding });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
