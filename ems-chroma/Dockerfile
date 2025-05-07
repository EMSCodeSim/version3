# Use a lightweight Python base image
FROM python:3.10-slim

# Install system dependencies
RUN apt-get update && apt-get install -y build-essential curl sqlite3 libsqlite3-dev

# Install Python packages
RUN pip install --upgrade pip
RUN pip install openai chromadb flask

# Set work directory
WORKDIR /app

# Copy project files
COPY chroma_setup.py .
COPY vector_search.py .
COPY hardcoded_responses.json .
COPY server.py .

# Expose Flask port
EXPOSE 5000

# Run the Flask server
CMD ["python", "server.py"]
