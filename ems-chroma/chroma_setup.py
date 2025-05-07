from openai import OpenAI
import chromadb
import json
import os

# Initialize OpenAI client and Chroma
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
chroma_client = chromadb.Client()
collection = chroma_client.get_or_create_collection("ems_responses")

# Load hardcoded responses
with open("hardcoded_responses.json", "r") as f:
    responses = json.load(f)

# Embed a single string
def embed_text(text):
    response = client.embeddings.create(
        model="text-embedding-3-small",
        input=[text]
    )
    return response.data[0].embedding

# Delete all existing entries marked as approved
collection.delete(where={"approved": True})

# Add all responses
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

print(f"✅ Added {len(responses)} items to Chroma.")
