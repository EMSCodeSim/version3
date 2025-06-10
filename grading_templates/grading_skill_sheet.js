// ===== NREMT Medical Assessment Skill Sheet Grading System (1pt each OPQRST/SAMPLE element) =====
window.skillSheetScoring = {
  // Scene Size-Up
  sceneSafety:              { label: "Takes/verbalizes PPE precautions", points: 1 },
  determinesSceneSafety:    { label: "Determines scene/situation is safe", points: 1 },
  determinesNatureOfIllness:{ label: "Determines nature of illness", points: 1 },
  determinesNumberOfPatients:{ label: "Determines number of patients", points: 1 },
  requestsAdditionalHelp:   { label: "Requests additional EMS help", points: 1 },
  considersCSpine:          { label: "Considers stabilization of spine", points: 1 },
  // Primary Assessment
  generalImpression:        { label: "Performs general impression", points: 1 },
  determinesResponsiveness: { label: "Determines responsiveness/AVPU", points: 1 },
  chiefComplaint:           { label: "Determines chief complaint/life threats", points: 1 },
  airway:                   { label: "Assesses airway", points: 1 },
  breathing:                { label: "Assesses breathing", points: 1 },
  managesLifeThreats:       { label: "Manages airway/breathing compromise", points: 1 },
  oxygen:                   { label: "Initiates oxygen therapy", points: 1 },
  assuresVentilation:       { label: "Assures adequate ventilation", points: 1 },
  circulation:              { label: "Checks pulse", points: 1 },
  skin:                     { label: "Assesses skin (color/temp/condition)", points: 1 },
  controlsMajorBleeding:    { label: "Controls major bleeding", points: 1 },
  shock:                    { label: "Initiates shock management", points: 1 },
  patientPriority:          { label: "Identifies patient priority/transport decision", points: 1 },

  // OPQRST (Each 1 point)
  opqrstOnset:              { label: "OPQRST: Onset", points: 1 },
  opqrstProvocation:        { label: "OPQRST: Provocation", points: 1 },
  opqrstQuality:            { label: "OPQRST: Quality", points: 1 },
  opqrstRadiation:          { label: "OPQRST: Radiation", points: 1 },
  opqrstSeverity:           { label: "OPQRST: Severity", points: 1 },
  opqrstTime:               { label: "OPQRST: Time", points: 1 },

  // SAMPLE (Each 1 point)
  sampleSigns:              { label: "SAMPLE: Signs/Symptoms", points: 1 },
  sampleAllergies:          { label: "SAMPLE: Allergies", points: 1 },
  sampleMedications:        { label: "SAMPLE: Medications", points: 1 },
  samplePastHistory:        { label: "SAMPLE: Past Medical History", points: 1 },
  sampleLastIntake:         { label: "SAMPLE: Last Oral Intake", points: 1 },
  sampleEvents:             { label: "SAMPLE: Events Leading Up", points: 1 },

  // Secondary Assessment & Vitals
  assessesVitalsBP:         { label: "Obtains BP", points: 1 },
  assessesVitalsPulse:      { label: "Obtains Pulse", points: 1 },
  assessesVitalsResp:       { label: "Obtains Respirations", points: 1 },
  fieldImpression:          { label: "States field impression", points: 1 },
  interventions:            { label: "Verbalizes proper interventions/treatment", points: 1 },
  reassessesPatient:        { label: "Reassesses patient/provides report", points: 1 },

  // Add others for trauma, pediatric, etc. as needed!
};
