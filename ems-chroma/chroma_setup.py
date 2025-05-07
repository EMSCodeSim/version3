import chromadb
import openai
import os

# Set your OpenAI API key
client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# Setup ChromaDB
chroma_client = chromadb.Client()
collection = chroma_client.get_or_create_collection("ems_responses")

# Embed using new API
def embed_text(text):
    response = client.embeddings.create(
        input=[text],
        model="text-embedding-3-small"
    )
    return response.data[0].embedding

# Optional: Flatten nested metadata
def flatten_metadata(item):
    def flatten(d, parent_key="", sep="_"):
        items = []
        for k, v in d.items():
            new_key = f"{parent_key}{sep}{k}" if parent_key else k
            if isinstance(v, dict):
                items.extend(flatten(v, new_key, sep=sep).items())
            else:
                items.append((new_key, v))
        return dict(items)
    return flatten(item)

# Load responses
import json
with open("hardcoded_responses.json", "r") as f:
    responses = json.load(f)

# Clear all vectors
collection.delete(where={"approved": True})

# Add responses to Chroma
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
