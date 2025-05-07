# Use official Python image
FROM python:3.10-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y build-essential curl sqlite3 libsqlite3-dev

# Upgrade pip and install Python dependencies
RUN pip install --upgrade pip
RUN pip install flask chromadb openai

# Copy project files into the image
COPY chroma_setup.py .
COPY vector_search.py .
COPY hardcoded_responses.json .
COPY server.py .

# Expose Flask server port
EXPOSE 5000

# Set command to run the server
CMD ["python", "server.py"]
