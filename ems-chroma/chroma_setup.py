import chromadb
import openai
import os
import json

openai.api_key = os.getenv("OPENAI_API_KEY")

# Initialize Chroma client and collection
client = chromadb.Client()
collection = client.get_or_create_collection("ems_responses")


def embed_text(text):
    result = openai.Embedding.create(
        input=[text],
        model="text-embedding-3-small"
    )
    return result["data"][0]["embedding"]


# Safely flatten metadata values for Chroma
def flatten_metadata(item):
    def flatten_value(value):
        if isinstance(value, (str, int, float, bool)):
            return value
        elif isinstance(value, list):
            return ", ".join(map(str, value))
        elif isinstance(value, dict):
            return json.dumps(value)
        else:
            return str(value)
    return {k: flatten_value(v) for k, v in item.items() if k != "userQuestion"}


# Load hardcoded responses
with open("hardcoded_responses.json", "r") as f:
    responses = json.load(f)

# Clear old vectors if needed (adjust filter as needed or remove this line to keep previous data)
collection.delete(where={"approved": True})

# Loop through and add embeddings
for i, item in enumerate(responses):
    if not item.get("userQuestion") or not item.get("aiResponse"):
        continue

    embedding = embed_text(item["userQuestion"])

    collection.add(
        documents=[item["userQuestion"]],
        ids=[f"id_{i}"],
        metadatas=[flatten_metadata(item)]
    )

print("Embedding setup complete.")
