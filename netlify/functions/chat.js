const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

exports.handler = async (event) => {
  try {
    const { message, patientInfo } = JSON.parse(event.body);

    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo",   // ✅ Using GPT-4 Turbo (correct and fast)
      messages: [
        {
          role: "system",
          content: `You will role-play as a realistic patient in a medical emergency based on the following information: ${patientInfo}.
          Only answer questions the user directly asks. 
          Do not guide, coach, or volunteer information. 
          Use emotional, physical, and verbal responses appropriate to the patient's condition. 
          React realistically if the user does not build rapport, misses key assessments, or delays treatment. 
          Adjust your answers based on the user's assessment and treatment quality.`,
        },
        { role: "user", content: message },
      ],
    });

    const reply = completion.choices[0]?.message?.content;

    console.log("GPT Reply:", reply);

    return {
      statusCode: 200,
      body: JSON.stringify({ reply: reply || "No response from AI." }),
    };

  } catch (error) {
    console.error("Function Error:", error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ reply: "Server error while generating response." }),
    };
  }
};
