exports.handler = async function(event, context) {
  try {
    const body = JSON.parse(event.body || '{}');
    const query = body.query?.toLowerCase() || "";

    // Fake vector dataset
    const hardcodedVectors = [
      { question: "when did the chest pain start", match: "About 10 minutes ago while sitting at the park." },
      { question: "do you take nitro", match: "Yes, I have nitro and take it if I feel pressure in my chest." },
      { question: "do you feel shortness of breath", match: "Yes, a little, especially if I try to walk." }
    ];

    // Basic match
    const result = hardcodedVectors.find(item => query.includes(item.question));
    const match = result ? result.match : null;

    return {
      statusCode: 200,
      body: JSON.stringify({ match })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ match: null })
    };
  }
};
