// /netlify/functions/gpt3_rephrase.js

import { OpenAI } from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async (req, res) => {
  try {
    const { message } = req.body;

    const prompt = `Rephrase this EMS student question to its most basic version:\n"${message}"`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
    });

    const rephrased = completion.choices[0].message.content.trim();

    return res.status(200).json({ rephrased });
  } catch (err) {
    console.error("GPT-3.5 rephrase failed:", err.message);
    return res.status(500).json({ error: "Rephrase failed." });
  }
};
