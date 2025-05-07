import chromadb
import openai
import os
import json

# Load API key
openai.api_key = os.getenv("OPENAI_API_KEY")

# Initialize Chroma client and collection
client = chromadb.Client()
collection = client.get_or_create_collection("ems_responses")

# Flatten nested metadata to a single-level dict with string values
def flatten_metadata(entry):
    flat = {}
    for key, value in entry.items():
        if isinstance(value, dict):
            for sub_key, sub_value in value.items():
                flat[f"{key}_{sub_key}"] = str(sub_value)
        else:
            flat[key] = str(value)
    return flat

# Embed input using new OpenAI v1.0+ API
def embed_text(text):
    response = openai.embeddings.create(
        input=[text],
        model="text-embedding-3-small"
    )
    return response.data[0].embedding

# Load hardcoded responses
with open("hardcoded_responses.json") as f:
    responses = json.load(f)

# Clear old vectors
collection.delete(where={})

# Add new documents
for i, item in enumerate(responses):
    if not item.get("userQuestion") or not item.get("aiResponse"):
        continue

    embedding = embed_text(item["userQuestion"])
    metadata = flatten_metadata(item)

    collection.add(
        documents=[item["userQuestion"]],
        ids=[f"id_{i}"],
        embeddings=[embedding],
        metadatas=[metadata]
    )

print("Embedding setup complete.")
