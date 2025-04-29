import openai
import json
import os

openai.api_key = os.getenv("OPENAI_API_KEY")

entries = [
    {
        "question": "when did the chest pain start",
        "match": "About 10 minutes ago while sitting at the park."
    },
    {
        "question": "do you take nitro",
        "match": "Yes, I have nitro and take it if I feel pressure in my chest."
    },
    {
        "question": "do you feel shortness of breath",
        "match": "Yes, a little, especially if I try to walk."
    },
    {
        "question": "are you allergic to anything",
        "match": "No, I have no known allergies."
    }
]

output = []

for entry in entries:
    print(f"Embedding: {entry['question']}")
    response = openai.Embedding.create(
        input=entry["question"],
        model="text-embedding-3-small"
    )
    embedding = response['data'][0]['embedding']
    output.append({
        "question": entry["question"],
        "embedding": embedding,
        "match": entry["match"]
    })

with open("embeddings.json", "w") as f:
    json.dump(output, f, indent=2)

print("✅ embeddings.json generated.")
