import { Configuration, OpenAIApi } from "openai";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, push } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyAmpYL8Ywfxkw_h2aMvF2prjiI0m5LYM40",
  authDomain: "ems-code-sim.firebaseapp.com",
  databaseURL: "https://ems-code-sim-default-rtdb.firebaseio.com",
  projectId: "ems-code-sim",
  storageBucket: "ems-code-sim.firebasestorage.app",
  messagingSenderId: "190498607578",
  appId: "1:190498607578:web:4cf6c8e999b027956070e3",
  measurementId: "G-2Q3ZT01YT1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// OpenAI setup
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

// Export Netlify handler
export default async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { messages, userInput, source } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "Missing or invalid messages array" });
  }

  try {
    // Request GPT-4 Turbo completion
    const completion = await openai.createChatCompletion({
      model: "gpt-4-turbo",
      messages,
    });

    const aiText = completion.data.choices[0].message.content.trim();

    // Log to Firebase hardcodeReview
    const reviewRef = ref(db, "hardcodeReview");
    await push(reviewRef, {
      userQuestion: userInput || "(unknown)",
      aiResponse: aiText,
      role: source === "proctor" ? "Proctor" : "Patient",
      timestamp: Date.now()
    });

    return res.status(200).json({ response: aiText });

  } catch (err) {
    console.error("GPT-4 Turbo Error:", err.message);
    return res.status(500).json({ error: "GPT-4 Turbo API failed." });
  }
};
