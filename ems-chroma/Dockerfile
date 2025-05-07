FROM python:3.10-slim

# Install dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    sqlite3 \
    libsqlite3-dev \
 && rm -rf /var/lib/apt/lists/*

# Upgrade pip and install Python packages
RUN pip install --upgrade pip
RUN pip install chromadb openai

# Set work directory
WORKDIR /app

# Copy project files
COPY chroma_setup.py .
COPY vector_search.py .
COPY hardcoded_responses.json .

# Set command to run setup
CMD ["python", "chroma_setup.py"]
