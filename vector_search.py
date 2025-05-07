
import chromadb
import openai
import os

openai.api_key = os.getenv("OPENAI_API_KEY")

# Initialize Chroma client and collection
client = chromadb.Client()
collection = client.get_or_create_collection("ems_responses")

def embed_input(text):
    result = openai.Embedding.create(
        input=[text],
        model="text-embedding-3-small"
    )
    return result["data"][0]["embedding"]

def search_response(query):
    query_vec = embed_input(query)
    result = collection.query(query_embeddings=[query_vec], n_results=1)
    
    if not result["documents"] or not result["documents"][0]:
        return "No match found."
    
    best_match = result["documents"][0][0]
    metadata = result["metadatas"][0][0]
    return f"Matched: {best_match}\n\nAI Response: {metadata['response']}"

# Example usage
if __name__ == "__main__":
    user_input = input("Ask something: ")
    reply = search_response(user_input)
    print(reply)
