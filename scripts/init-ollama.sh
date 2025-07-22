#!/bin/bash

# Initialize Ollama with SmolLM2 model for development
echo "🤖 Initializing Ollama with SmolLM2 model..."

# Wait for Ollama service to be ready
echo "⏳ Waiting for Ollama service..."
until curl -f http://ollama:11434/api/tags >/dev/null 2>&1; do
  echo "Waiting for Ollama to start..."
  sleep 5
done

echo "✅ Ollama service is ready!"

# Pull SmolLM2 1.7B model if not already present
echo "📥 Checking for SmolLM2 model..."
if ! curl -s http://ollama:11434/api/tags | grep -q "smollm2:1.7b"; then
  echo "🔄 Pulling SmolLM2 1.7B model (this may take a few minutes)..."
  curl -X POST http://ollama:11434/api/pull \
    -H "Content-Type: application/json" \
    -d '{"name": "smollm2:1.7b"}'
  
  echo "✅ SmolLM2 model ready for use!"
else
  echo "✅ SmolLM2 model already available!"
fi

echo "🚀 Ollama initialization complete!"
echo "📊 Available models:"
curl -s http://ollama:11434/api/tags | jq '.models[].name' || echo "Models list available at http://localhost:11434/api/tags"