// .netlify/functions/embed.js
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async (event, context) => {
  try {
    const { input } = JSON.parse(event.body);
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input
    });
    return {
      statusCode: 200,
      body: JSON.stringify({ embedding: response.data[0].embedding })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
