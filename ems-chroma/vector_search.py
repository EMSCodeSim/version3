from openai import OpenAI
import chromadb
import os

# Initialize OpenAI client and Chroma collection
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
chroma_client = chromadb.Client()
collection = chroma_client.get_or_create_collection("ems_responses")

# Embed input query using updated OpenAI SDK
def embed_input(text):
    response = client.embeddings.create(
        model="text-embedding-3-small",
        input=[text]
    )
    return response.data[0].embedding

# Search the collection for the best match
def search_response(query):
    query_vec = embed_input(query)
    result = collection.query(query_embeddings=[query_vec], n_results=1)
    
    if not result["documents"] or not result["documents"][0]:
        return "No match found."

    matched_question = result["documents"][0][0]
    metadata = result["metadatas"][0][0]
    return f"Matched: {matched_question}\n\nAI Response: {metadata['response']}"

# Interactive use
if __name__ == "__main__":
    while True:
        user_input = input("Ask something (or type 'exit'): ").strip()
        if user_input.lower() == "exit":
            break
        reply = search_response(user_input)
        print(reply)
