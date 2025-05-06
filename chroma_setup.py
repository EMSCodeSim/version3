import chromadb
import json
import os
import openai

# Set your OpenAI key
openai.api_key = os.getenv("OPENAI_API_KEY")  # or replace with key string

# Initialize ChromaDB client
client = chromadb.Client()
collection = client.get_or_create_collection("ems_responses")

# Load hardcoded responses from local JSON
with open("hardcoded_responses.json", "r") as f:
    responses = json.load(f)

# Function to embed a user question using OpenAI
def embed_text(text):
    result = openai.Embedding.create(
        input=[text],
        model="text-embedding-3-small"
    )
    return result["data"][0]["embedding"]

# Clear old vectors if needed
collection.delete()

# Loop through each response and add to Chroma
for i, item in enumerate(responses):
    if not item.get("userQuestion") or not item.get("aiResponse"):
        continue

    embedding = embed_text(item["userQuestion"])

    collection.add(
        documents=[item["userQuestion"]],
        ids=[f"id_{i}"],
        metadatas=[{
            "response": item["aiResponse"],
            "approved": item.get("approved", False),
            "tags": item.get("tags", [])
        }],
        embeddings=[embedding]
    )

print(f"✅ Added {len(responses)} entries to Chroma.")
