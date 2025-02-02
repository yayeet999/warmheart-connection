# Emotion Analyzer Edge Function

This function analyzes the emotional content of user messages and stores the analysis in Redis.

## Features

- Analyzes last 20 messages from chat history
- Uses GPT-4 to perform emotional analysis
- Stores results in Redis with 5-minute expiry
- Provides both immediate (last 3 messages) and rolling (last 20 messages) context

## Input Format

```json
{
  "userId": "string"
}
```

## Output Format

```json
{
  "analysis": {
    "primary_emotion": "string",
    "primary_sub_emotion": "string",
    "primary_intensity": number,
    "secondary_emotion": "string",
    "secondary_sub_emotion": "string",
    "secondary_intensity": number,
    "context_description": "string"
  }
}
```

## Required Environment Variables

- OPENAI_API_KEY
- UPSTASH_REDIS_REST_URL
- UPSTASH_REDIS_REST_TOKEN