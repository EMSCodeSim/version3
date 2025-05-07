from flask import Flask, request, jsonify
import chromadb
import os

app = Flask(__name__)

# Setup Chroma client
client = chromadb.Client()
collection = client.get_or_create_collection("default")

# Home route to verify server is running
@app.route("/", methods=["GET"])
def home():
    return "Vector search server is live."

# Search route
@app.route("/search", methods=["POST"])
def search():
    try:
        data = request.get_json()
        query = data.get("query", "")

        result = collection.query(
            query_texts=[query],
            n_results=1
        )

        matched_question = result["documents"][0][0] if result["documents"] else "No match found"
        metadata = result["metadatas"][0][0] if result["metadatas"] else {}

        return jsonify({
            "matched_question": matched_question,
            "metadata": metadata
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
