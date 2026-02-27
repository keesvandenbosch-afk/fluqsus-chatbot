import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// ─────────────────────────────────────────────────────────
//  EIGEN DOCUMENTEN
//  Voeg hier je eigen teksten toe. Later kun je dit
//  uitbreiden met een PDF-upload of database.
// ─────────────────────────────────────────────────────────
const EIGEN_DOCUMENTEN = `
=== FLUQSUS PROCEDURES & FAQ ===

[Voeg hier je eigen documentatie toe]

Voorbeelden:
- Onze standaard AFAS inrichting voor verlofaanvragen
- Klantspecifieke werkwijzen
- Interne procedures
- Veelgestelde vragen van klanten

Tip: je kunt meerdere blokken toevoegen, gescheiden door ---
`;

// ─────────────────────────────────────────────────────────
//  AFAS HELP ZOEKEN
// ─────────────────────────────────────────────────────────
async function zoekAfasHelp(vraag) {
  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      tools: [
        {
          type: 'web_search_20250305',
          name: 'web_search',
        }
      ],
      messages: [
        {
          role: 'user',
          content: `Zoek op help.afas.nl naar: "${vraag}". 
Geef een duidelijk antwoord in het Nederlands op basis van de AFAS helppagina's.
Noem het exacte menupad in AFAS als dat relevant is.`
        }
      ]
    });

    return response.content
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('\n') || null;

  } catch (err) {
    console.error('Zoekfout AFAS help:', err.message);
    return null;
  }
}

// ─────────────────────────────────────────────────────────
//  HOOFD CHAT LOGICA
// ─────────────────────────────────────────────────────────
async function beantwoordVraag(vraag, uploadTekst = null) {
  
  // Zoek eerst in AFAS help
  const afasInfo = await zoekAfasHelp(vraag);
  const gebruikteBronnen = [];
  
  if (afasInfo) gebruikteBronnen.push('help.afas.nl');
  if (EIGEN_DOCUMENTEN.trim()) gebruikteBronnen.push('Eigen documenten');
  if (uploadTekst) gebruikteBronnen.push('Geüpload document');

  const systeem = `Je bent de AFAS-assistent van Fluqsus Consultancy.
Je helpt gebruikers met vragen over AFAS op basis van de helpdocumentatie en Fluqsus-documenten.

Regels:
- Antwoord altijd in het Nederlands
- Geef concrete, praktische antwoorden
- Gebruik <strong>Menupad → Submenu</strong> voor navigatie in AFAS
- Als iets niet in de bronnen staat, zeg dat eerlijk
- Houd antwoorden beknopt maar volledig

${afasInfo ? `--- Gevonden op help.afas.nl ---\n${afasInfo}\n` : ''}
--- Fluqsus eigen documentatie ---
${EIGEN_DOCUMENTEN}
${uploadTekst ? `--- Geüpload document ---\n${uploadTekst}` : ''}`;

  const antwoord = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 800,
    system: systeem,
    messages: [{ role: 'user', content: vraag }]
  });

  return {
    answer: antwoord.content[0].text,
    source: gebruikteBronnen[0] || 'Fluqsus Assistent',
    sources: gebruikteBronnen,
  };
}

// ─────────────────────────────────────────────────────────
//  VERCEL HANDLER
// ─────────────────────────────────────────────────────────
export default async function handler(req, res) {

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Alleen POST toegestaan' });
  }

  const { question, documentText } = req.body || {};

  if (!question?.trim()) {
    return res.status(400).json({ error: 'Geen vraag opgegeven' });
  }

  try {
    const resultaat = await beantwoordVraag(question.trim(), documentText || null);
    return res.status(200).json(resultaat);
  } catch (err) {
    console.error('Handler fout:', err);
    return res.status(500).json({
      answer: 'Er is een technische fout opgetreden. Probeer het opnieuw.',
      source: 'Systeem',
      sources: [],
    });
  }
}
