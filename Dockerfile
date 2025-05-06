# Use an official Python image with SQLite ≥ 3.35
FROM python:3.10-slim

# Set working directory
WORKDIR /app

# Install dependencies
RUN apt-get update && apt-get install -y build-essential curl

# Install Python packages
RUN pip install --upgrade pip
RUN pip install chromadb openai

# Copy your script and data into the container
COPY chroma_setup.py .
COPY hardcoded_responses.json .

# Default command
CMD ["python", "chroma_setup.py"]
