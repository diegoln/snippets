# Google Gemini API Setup

This application uses Google Gemini for AI-powered features like weekly snippet generation and reflection drafts.

## Getting a Gemini API Key

1. **Visit Google AI Studio**: Go to [https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)

2. **Sign in**: Use your Google account (same account you use for GCP if applicable)

3. **Create API Key**: Click "Create API Key" 
   - If you have existing GCP projects, you can choose one
   - Otherwise, create a new project

4. **Copy the Key**: Save your API key securely

## Configuration

Add your API key to your environment file:

```bash
# In .env.local (for local development)
GEMINI_API_KEY="your-actual-api-key-here"
GEMINI_MODEL="gemini-1.5-flash"
```

## Environment Setup

The application supports the same Gemini configuration for both development and production:

- **Development**: Uses `.env.local` or `.env.development`
- **Production**: Uses GCP environment variables or `.env`

## Models Available

- `gemini-1.5-flash` (default) - Fast, cost-effective
- `gemini-1.5-pro` - More capable, higher cost
- `gemini-1.0-pro` - Legacy model

## Cost Comparison

Gemini is significantly cheaper than OpenAI:
- **Gemini 1.5 Flash**: ~$0.075 per 1M input tokens, $0.30 per 1M output tokens
- **OpenAI GPT-3.5**: ~$1.50 per 1M input tokens, $2.00 per 1M output tokens

## Fallback Behavior

If no API key is configured:
- Application falls back to mock responses
- Mock responses are tailored to each user persona (like Jack Thompson)
- You'll see a warning: "⚠️ GEMINI_API_KEY not found. Using mock responses."

## Testing

After adding your API key:
1. Restart the development server: `npm run dev`
2. Complete the onboarding flow with calendar integration
3. Check server logs for "Gemini API" messages instead of mock responses