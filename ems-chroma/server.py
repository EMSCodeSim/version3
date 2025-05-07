from flask import Flask, request, jsonify
import chromadb

app = Flask(__name__)

client = chromadb.Client()
collection = client.get_or_create_collection("default")

# Optional home route for testing
@app.route("/")
def home():
    return "Vector search server is live."

@app.route("/search", methods=["POST"])
def search():
    try:
        query = request.json["query"]
        result = collection.query(query_texts=[query], n_results=1)
        matched_question = result["documents"][0][0]
        metadata = result["metadatas"][0][0]
        return jsonify({
            "matched_question": matched_question,
            "response": metadata["response"]
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
