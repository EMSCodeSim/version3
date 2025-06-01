const { OpenAI } = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Full NREMT Medical Assessment Skill Sheet—each checklist line as an ID
const skillSheetLines = [
  // Scene Size-up
  { id: "verbalizesPPEPrecautions",       desc: "Takes or verbalizes appropriate PPE precautions" },
  { id: "verbalizesSceneSafety",          desc: "Determines the scene/situation is safe" },
  { id: "determinesMOIorNOI",             desc: "Determines the mechanism of injury/nature of illness (MOI/NOI)" },
  { id: "determinesNumberOfPatients",     desc: "Determines the number of patients" },
  { id: "requestsAdditionalEMS",          desc: "Requests additional EMS assistance if necessary" },
  { id: "considersCSpineStabilization",   desc: "Considers stabilization of spine as indicated" },

  // Primary Assessment
  { id: "verbalizesGeneralImpression",    desc: "Verbalizes general impression of the patient" },
  { id: "determinesResponsiveness",       desc: "Determines responsiveness/level of consciousness (AVPU)" },
  { id: "determinesChiefComplaint",       desc: "Determines chief complaint/apparent life-threats" },

  // Airway
  { id: "assessesAirway",                 desc: "Opens and assesses airway" },
  { id: "insertsAirwayAdjunct",           desc: "Inserts airway adjunct as indicated" },

  // Breathing
  { id: "assessesBreathing",              desc: "Assesses breathing" },
  { id: "assuresAdequateVentilation",     desc: "Assures adequate ventilation" },
  { id: "initiatesOxygenTherapy",         desc: "Initiates appropriate oxygen therapy" },
  { id: "managesInjuryBreathing",         desc: "Manages any injury which may compromise breathing/ventilation" },

  // Circulation
  { id: "assessesPulse",                  desc: "Checks pulse" },
  { id: "assessesSkin",                   desc: "Assesses skin (color, temperature, condition)" },
  { id: "assessesAndControlsBleeding",    desc: "Assesses for and controls major bleeding if present" },
  { id: "initiatesShockManagement",       desc: "Initiates shock management (positioning, oxygen, preventing heat loss)" },
  { id: "identifiesPriorityTransportDecision", desc: "Identifies patient priority and makes transport/scene decision" },

  // History Taking
  { id: "obtainsOPQRSTHistory",           desc: "Obtains history of present illness (OPQRST)" },
  { id: "obtainsSAMPLEHistory",           desc: "Obtains past medical history (SAMPLE)" },

  // Secondary Assessment (Detailed Head-to-Toe)
  { id: "assessesHead",                   desc: "Assesses head (inspects and palpates scalp, ears, eyes, mouth, nose, facial areas)" },
  { id: "assessesNeck",                   desc: "Assesses neck (trachea position, jugular veins, cervical spine)" },
  { id: "assessesChest",                  desc: "Assesses chest (inspection, palpation, auscultation)" },
  { id: "assessesAbdomenPelvis",          desc: "Assesses abdomen/pelvis (inspection, palpation, assessment for injury/instability)" },
  { id: "assessesLowerExtremities",       desc: "Assesses lower extremities" },
  { id: "assessesUpperExtremities",       desc: "Assesses upper extremities" },
  { id: "assessesPosterior",              desc: "Assesses posterior (posterior thorax, lumbar, and buttocks)" },

  // Vital Signs & Management
  { id: "obtainsBaselineVitals",          desc: "Obtains baseline vital signs (BP, pulse, respirations)" },
  { id: "managesSecondaryInjuries",       desc: "Manages secondary injuries/wounds appropriately" },

  // Reassessment & Handoff
  { id: "verbalizesFieldImpression",      desc: "Verbalizes field impression of patient" },
  { id: "verbalizesInterventions",        desc: "Verbalizes proper interventions/treatment" },
  { id: "reassessesPatient",              desc: "Reassesses patient appropriately" },
  { id: "providesAccurateHandoffReport",  desc: "Provides accurate verbal report to arriving EMS unit or receiving facility" }
];

const SKILL_IDS = skillSheetLines.map(x => x.id);

exports.handler = async (event) => {
  try {
    const { question, response, tags } = JSON.parse(event.body || "{}");
    if (!question && !response) {
      return { statusCode: 400, body: JSON.stringify({ error: "Missing question/response" }) };
    }

    // Strict, clear prompt:
    const prompt = `
You are an EMS testing expert. Assign the single most appropriate and specific NREMT Medical Assessment Skill Sheet line item (Skill Sheet ID) for the following entry.
Choose ONLY ONE from this list (choose the most specific possible match):
${SKILL_IDS.join(",\n")}

If none apply, reply ONLY with: none

Question: ${question || "(none)"}
Response: ${response || "(none)"}
Tags: ${Array.isArray(tags) ? tags.join(", ") : "(none)"}

Respond ONLY with a single Skill Sheet ID from the list above, no extra text, no explanations, no punctuation.
`;

    const gptRes = await openai.chat.completions.create({
      model: "gpt-4o", // or "gpt-3.5-turbo"
      messages: [{ role: "user", content: prompt }],
      max_tokens: 16,
      temperature: 0,
    });

    const raw = gptRes.choices[0].message.content.trim();

    // Strict post-processing: exact match only (case-insensitive, ignores whitespace/punctuation)
    let skillSheetID = "none";
    const normalize = s => s.replace(/[\s\.\:\-_,]/g,"").toLowerCase();
    for (const id of SKILL_IDS) {
      if (normalize(raw) === normalize(id)) {
        skillSheetID = id;
        break;
      }
    }
    if (normalize(raw) === "none") skillSheetID = "none";

    return {
      statusCode: 200,
      body: JSON.stringify({ skillSheetID, raw }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
