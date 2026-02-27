const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const EIGEN_DOCUMENTEN = `
Hier kun je eigen Fluqsus-documentatie toevoegen.
Bijvoorbeeld: procedures, klantspecifieke instellingen, FAQ's.
`;

module.exports = async function handler(req, res) {

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Alleen POST toegestaan' });
  }

  const { question } = req.body || {};

  if (!question || !question.trim()) {
    return res.status(400).json({ error: 'Geen vraag opgegeven' });
  }

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 800,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      system: `Je bent de AFAS-assistent van Fluqsus Consultancy.
Zoek altijd eerst op help.afas.nl naar het antwoord.
Antwoord in het Nederlands. Wees praktisch en concreet.
Gebruik <strong>Menu → Submenu</strong> voor navigatiepaden in AFAS.

--- Fluqsus documentatie ---
${EIGEN_DOCUMENTEN}`,
      messages: [{ role: 'user', content: question.trim() }]
    });

    const answer = response.content
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('\n') || 'Geen antwoord gevonden.';

    const usedSearch = response.content.some(b => b.type === 'tool_use');

    return res.status(200).json({
      answer,
      source: usedSearch ? 'help.afas.nl' : 'Eigen documenten',
      sources: usedSearch ? ['help.afas.nl', 'Eigen documenten'] : ['Eigen documenten'],
    });

  } catch (err) {
    console.error('Handler fout:', err);
    return res.status(500).json({
      answer: 'Er is een technische fout opgetreden. Probeer het opnieuw.',
      source: 'Systeem',
      sources: [],
    });
  }
};
