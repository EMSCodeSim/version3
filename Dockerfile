FROM python:3.10-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y build-essential curl

# Install Python packages
RUN pip install --upgrade pip
RUN pip install chromadb openai

# Copy project files
COPY chroma_setup.py .
COPY vector_search.py .
COPY hardcoded_responses.json .

# Set default command to launch search after setup
CMD python chroma_setup.py && echo "Setup complete. Starting search..." && python vector_search.py

