FROM python:3.10-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y build-essential curl sqlite3 libsqlite3-dev

# Install Python packages
RUN pip install --upgrade pip
RUN pip install openai chromadb

# Copy project files
COPY chroma_setup.py .
COPY vector_search.py .
COPY hardcoded_responses.json .

# Run setup
CMD ["python", "chroma_setup.py"]
