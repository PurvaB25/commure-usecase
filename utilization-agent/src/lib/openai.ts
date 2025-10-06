// OpenAI client configuration
import OpenAI from 'openai';

// Initialize OpenAI client with API key from environment variable
// Note: For v0 demo, this runs client-side. In production, move to backend.
export const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true, // Required for client-side use (v0 only)
});
