exports.handler = async function(event, context) {
  try {
    const body = JSON.parse(event.body || '{}');
    const prompt = body.prompt || "";

    let reply = "I'm sorry, I didn't quite catch that. Could you rephrase?";

    if (prompt.toLowerCase().includes("chest pain")) {
      reply = "The patient describes the chest pain as heavy pressure and rates it 8 out of 10.";
    } else if (prompt.toLowerCase().includes("nitro")) {
      reply = "Yes, I have nitro and sometimes take it when I feel chest pressure.";
    } else if (prompt.toLowerCase().includes("shortness of breath")) {
      reply = "Yes, I feel a little short of breath, especially when I try to move.";
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ reply })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ reply: "Error processing request." })
    };
  }
};
