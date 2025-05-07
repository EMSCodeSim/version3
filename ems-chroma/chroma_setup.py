import chromadb
import openai
import os
import json

# Initialize OpenAI client
client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# Initialize Chroma client and collection
chroma_client = chromadb.Client()
collection = chroma_client.get_or_create_collection("ems_responses")

# Embed user input using OpenAI
def embed_text(text):
    response = client.embeddings.create(
        input=[text],
        model="text-embedding-3-small"
    )
    return response.data[0].embedding

# Flatten metadata (ensures everything is str/int/float/bool)
def flatten_metadata(data, parent_key="", sep="_"):
    flat = {}
    for k, v in data.items():
        new_key = f"{parent_key}{sep}{k}" if parent_key else k
        if isinstance(v, dict):
            flat.update(flatten_metadata(v, new_key, sep=sep))
        elif isinstance(v, (str, int, float, bool)):
            flat[new_key] = v
        else:
            # Convert unsupported types (e.g., list, None) to string
            flat[new_key] = str(v)
    return flat

# Load responses
with open("hardcoded_responses.json", "r") as f:
    responses = json.load(f)

# Clear previous documents
collection.delete(where={"approved": True})

# Embed and add to Chroma
for i, item in enumerate(responses):
    if not item.get("userQuestion") or not item.get("aiResponse"):
        continue
    embedding = embed_text(item["userQuestion"])
    metadata = flatten_metadata(item)
    collection.add(
        documents=[item["userQuestion"]],
        ids=[f"id_{i}"],
        metadatas=[metadata]
    )

print("Embedding setup complete.")
