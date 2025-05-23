import OpenAI from 'openai';
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function handler(event) {
  const { handoffText } = JSON.parse(event.body);

  const prompt = `
You are an EMS instructor grading a student's verbal patient handoff. Use the following checklist:

Checklist:
1. Age/Sex of patient
2. Chief Complaint
3. OPQRST summary
4. SAMPLE summary
5. Relevant vitals (HR, RR, BP, O2, etc.)
6. Treatments given
7. Response to treatment (if any)
8. Transport decision (urgent/destination)

Grade the report by:
- Listing what was present
- Listing what was missing
- Giving 2 specific improvement tips

Student Report:
` + handoffText;

  const response = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
      { role: "system", content: "You are an EMS instructor grading reports." },
      { role: "user", content: prompt }
    ]
  });

  return {
    statusCode: 200,
    body: JSON.stringify({ result: response.choices[0].message.content })
  };
}
