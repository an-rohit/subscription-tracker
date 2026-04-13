const axios = require('axios');

const MODELS = [
  'google/gemma-4-31b-it:free',
  'nvidia/llama-3.1-nemotron-super-253b-v1:free',
  'meta-llama/llama-3.2-3b-instruct:free',
];

const callAI = async (systemPrompt, userMessage, modelIndex = 0, retries = 2) => {
  try {
    const model = MODELS[modelIndex];
    console.log(`Trying model: ${model}`);

    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user',   content: userMessage },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://subscription-tracker-api-sf0z.onrender.com',
          'X-Title': 'Subscription Tracker',
        },
        timeout: 30000, // 30 second timeout
      }
    );

    return response.data.choices[0].message.content;

  } catch (err) {
    const status = err.response?.status;
    console.log(`Model failed with status: ${status}`);

    // Rate limited — wait and retry same model
    if (status === 429 && retries > 0) {
      console.log(`Rate limited. Waiting 5s and retrying...`);
      await new Promise(resolve => setTimeout(resolve, 5000));
      return callAI(systemPrompt, userMessage, modelIndex, retries - 1);
    }

    // Model not found or unavailable — try next model
    if ((status === 404 || status === 503) && modelIndex < MODELS.length - 1) {
      console.log(`Switching to next model...`);
      return callAI(systemPrompt, userMessage, modelIndex + 1, 2);
    }

    throw err;
  }
};

module.exports = { callAI };