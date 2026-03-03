const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// ─────────────────────────────────────────────────────────────
//  FLUQSUS WEBSITE INHOUD (opgehaald van www.fluqsus.nl)
// ─────────────────────────────────────────────────────────────
const FLUQSUS_INFO = `
=== OVER FLUQSUS CONSULTANCY ===

Fluqsus Consultancy wordt gerund door Kees van den Bosch.
Hij biedt verschillende diensten om bedrijfsprocessen op het gebied
van HRM en Payroll zo optimaal mogelijk in te richten en te beheren.
Kees heeft meerdere jaren ervaring als AFAS business consultant en heeft
zijn kennis bij een groot aantal bedrijven ingezet.

Slogan: "Jouw processen op orde, jouw organisatie vooruit"

=== DIENSTEN ===
- Advies over huidige AFAS inrichting
- Tijdelijke ondersteuning bij uitval
- Digitalisering en optimalisatie van processen
- HRM en Payroll inrichting en beheer
- AFAS business consultancy

=== CONTACT ===
- E-mail: info@fluqsus.nl
- Telefoon: 06-34966614
- Adres: Leiduinstraat 6-3, 1058SJ Amsterdam
- KVK: 99038846
- Website: www.fluqsus.nl

=== DOCUMENTEN ===
- Algemene Voorwaarden beschikbaar op de website
- Privacyverklaring beschikbaar op de website
`;

// ─────────────────────────────────────────────────────────────
//  EIGEN DOCUMENTEN — voeg hier aanvullende teksten toe
// ─────────────────────────────────────────────────────────────
const EIGEN_DOCUMENTEN = `
Hier kun je aanvullende Fluqsus-documentatie toevoegen.
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
      system: `Je bent de assistent van Fluqsus Consultancy (www.fluqsus.nl).
Je helpt bezoekers met vragen over Fluqsus en over AFAS software.

ZOEKSTRATEGIE:
- Vragen over Fluqsus (diensten, contact, wie is Kees, werkwijze):
  → Gebruik eerst de meegeleverde Fluqsus-informatie hieronder.
  → Zoek aanvullend op "fluqsus.nl" als je meer details nodig hebt.
- Vragen over AFAS software (hoe werkt iets, instellen, menu's):
  → Zoek op help.afas.nl voor de juiste informatie.
- Vragen die beide betreffen:
  → Combineer beide bronnen.

REGELS:
- Antwoord altijd in het Nederlands
- Wees concreet en praktisch
- Gebruik <strong>Menu → Submenu</strong> voor AFAS navigatiepaden
- Verwijs bij contactvragen naar info@fluqsus.nl of 06-34966614
- Als je iets niet kunt vinden, zeg dat eerlijk

=== FLUQSUS INFORMATIE ===
${FLUQSUS_INFO}

=== EIGEN DOCUMENTATIE ===
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
      source: usedSearch ? 'Web zoekopdracht' : 'Fluqsus documentatie',
      sources: usedSearch ? ['fluqsus.nl', 'help.afas.nl'] : ['Fluqsus documentatie'],
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
