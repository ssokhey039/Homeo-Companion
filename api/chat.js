// ================================================================
// Homeo Companion - Backend API
// This file runs on Vercel SERVER - users never see your API key!
// ================================================================

export default async function handler(req, res) {

  // Allow requests from your website (CORS)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle browser preflight check
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { messages, systemPrompt, type } = req.body;

    if (!messages && !type) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // ── API key is SAFE here on the server ──
    const API_KEY = process.env.GEMINI_API_KEY;

    if (!API_KEY) {
      return res.status(500).json({ error: 'API key not configured on server' });
    }

    const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;

    // Build request body for Gemini
    const geminiBody = {
      generationConfig: {
        maxOutputTokens: type === 'nutrition' ? 200 : 400,
        temperature: type === 'nutrition' ? 0.3 : 0.85,
      }
    };

    // Add system instruction if provided
    if (systemPrompt) {
      geminiBody.system_instruction = {
        parts: [{ text: systemPrompt }]
      };
    }

    // Add conversation messages
    geminiBody.contents = messages;

    // Call Gemini API from SERVER (key is hidden!)
    const geminiRes = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(geminiBody),
    });

    const data = await geminiRes.json();

    // Handle Gemini errors
    if (data.error) {
      console.error('Gemini error:', data.error);
      return res.status(500).json({ error: data.error.message });
    }

    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    if (!reply) {
      return res.status(500).json({ error: 'Empty response from AI' });
    }

    // Send reply back to user's browser
    return res.status(200).json({ reply });

  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
}
