const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

exports.handler = async (event) => {
  try {
    const { message, patientInfo, role } = JSON.parse(event.body);

    let systemPrompt = "";

    if (role === "proctor") {
      systemPrompt = `
        You are a certified NREMT test proctor for the EMT Basic exam.
        You are not the patient. 
        You only respond when the user asks for information the patient would not know, such as:
        - Vital signs (blood pressure, pulse, respiratory rate, lung sounds, SaO2, blood sugar, skin appearance)
        - Scene information (scene safety, time of day, outside temperature, number of patients, objects at scene)
        - Painful stimuli response
        You also acknowledge procedures when performed, such as giving aspirin, applying oxygen, or taking vitals.
        Do not volunteer information or coach. Be factual, brief, and professional.
      `;
    } else {
      systemPrompt = `
        You will role-play as a realistic patient in a medical emergency based on the following information: ${patientInfo}.
        Only answer questions the user directly asks.
        Do not guide, coach, or volunteer information.
        Use emotional, physical, and verbal responses appropriate to the patient's condition.
        React realistically if the user does not build rapport, misses key assessments, or delays treatment.
        Adjust your answers based on the user's assessment and treatment quality.
      `;
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message },
      ],
    });

    const reply = completion.choices[0]?.message?.content;

    console.log(`${role.toUpperCase()} Reply:`, reply);

    return {
      statusCode: 200,
      body: JSON.stringify({ reply: reply || "No response." }),
    };

  } catch (error) {
    console.error("Function Error:", error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ reply: "Server error while generating response." }),
    };
  }
};
