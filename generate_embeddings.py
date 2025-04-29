import openai
import json
import time

openai.api_key = "your-openai-api-key"

def get_embedding(text):
    response = openai.Embedding.create(
        model="text-embedding-ada-002",
        input=text
    )
    return response['data'][0]['embedding']

with open('chat_log.json', 'r') as f:
    chat_data = json.load(f)

for entry in chat_data:
    first_question = entry['userQuestions'][0] if isinstance(entry['userQuestions'], list) else entry['userQuestion']
    print(f"Embedding for: {first_question}")
    entry['embedding'] = get_embedding(first_question)
    time.sleep(1.1)  # respect OpenAI rate limits

with open('chat_log_with_embeddings.json', 'w') as f:
    json.dump(chat_data, f, indent=2)

print("Updated chat log saved to chat_log_with_embeddings.json")
