# Getting a free Gemini API key

The Gemini Developer API is free to use within generous rate limits and is the
key referenced as `GEMINI_API_KEY` in scripts/curl examples across this project.

## Steps

1. Go to [Google AI Studio](https://aistudio.google.com/apikey).
2. Sign in with a Google account.
3. Click **Create API key** and select (or create) a Google Cloud project when prompted.
4. Copy the generated key and store it as an environment variable:

   ```bash
   export GEMINI_API_KEY="your-key-here"
   ```

## Notes

- This key is for the **Gemini Developer API** (API-key auth), not Vertex AI
  (which uses GCP service-account/OAuth auth instead).
- Free tier usage is rate-limited per model; check current limits on the
  [pricing page](https://ai.google.dev/pricing).
- Treat the key like a secret — don't commit it. Use `.env` files (already
  gitignored in this repo) or your shell profile.
