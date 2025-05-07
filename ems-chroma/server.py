from flask import Flask, request, jsonify
import chromadb
import json

app = Flask(__name__)

# Initialize Chroma client
client = chromadb.Client()
collection = client.get_or_create_collection("default")

# Search function
def search_response(query):
    result = collection.query(
        query_texts=[query],
        n_results=1
    )
    matched_question = result["documents"][0][0]
    metadata = result["metadatas"][0][0]
    return {
        "matched_question": matched_question,
        "ai_response": metadata["response"]
    }

# API route
@app.route('/query', methods=['POST'])
def query():
    data = request.get_json()
    user_input = data.get("question", "")
    if not user_input:
        return jsonify({"error": "No question provided."}), 400
    
    try:
        result = search_response(user_input)
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
