const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// ─────────────────────────────────────────────
//  EIGEN DOCUMENTEN — voeg hier je teksten toe
// ─────────────────────────────────────────────
const EIGEN_DOCUMENTEN = `
Hier kun je eigen Fluqsus-documentatie toevoegen.
Bijvoorbeeld: procedures, klantspecifieke instellingen, FAQ's.
`;

module.exports = async function handler(req, res) {

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Alleen POST toegestaan' });

  const { question } = req.body || {};
  if (!question?.trim()) return res.status(400).json({ error: 'Geen vraag opgegeven' });

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      system: `Je bent de assistent van Fluqsus Consultancy (fluqsus.nl).
Je helpt bezoekers met twee soorten vragen:

1. VRAGEN OVER FLUQSUS (diensten, over ons, contact, werkwijze, prijzen):
   → Zoek altijd op site:fluqsus.nl of "fluqsus.nl" om actuele informatie te vinden.

2. VRAGEN OVER AFAS SOFTWARE (hoe werkt iets, waar vind ik iets, instellen):
   → Zoek altijd op help.afas.nl voor de juiste informatie.

3. VRAGEN DIE BEIDE BETREFFEN:
   → Zoek op beide bronnen en combineer de informatie.

Regels:
- Antwoord altijd in het Nederlands
- Wees concreet en praktisch
- Gebruik <strong>Menu → Submenu</strong> voor AFAS navigatiepaden
- Als je iets niet kunt vinden, zeg dat eerlijk en verwijs naar info@fluqsus.nl

--- Fluqsus eigen documentatie ---
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
      source: usedSearch ? 'Web zoekopdracht' : 'Eigen documentatie',
      sources: usedSearch ? ['fluqsus.nl', 'help.afas.nl'] : ['Eigen documentatie'],
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
