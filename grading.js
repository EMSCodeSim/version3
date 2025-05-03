
let gradingTemplate = {};
let scoreTracker = {};

function initializeScoreTracker() {
  for (let key in gradingTemplate) {
    if (key !== "criticalFails") {
      scoreTracker[key] = false;
    }
  }
  scoreTracker.criticalFails = [];
}

function updateScoreTracker(input) {
  const msg = input.toLowerCase();
  if (msg.includes("scene safe")) scoreTracker.sceneSafety = true;
  if (msg.includes("gloves") || msg.includes("bsi")) scoreTracker.BSI = true;
  if (msg.includes("nature of illness")) scoreTracker.mechanismInjury = true;
  if (msg.includes("number of patients")) scoreTracker.numberPatients = true;
  if (msg.includes("call for help") || msg.includes("additional help")) scoreTracker.additionalHelp = true;
  if (msg.includes("c-spine") || msg.includes("immobilize")) scoreTracker.cSpine = true;
  if (msg.includes("general impression")) scoreTracker.generalImpression = true;
  if (msg.includes("responsive") || msg.includes("avpu")) scoreTracker.responsiveness = true;
  if (msg.includes("chief complaint")) scoreTracker.chiefComplaint = true;
  if (msg.includes("airway")) scoreTracker.airwayAssessment = true;
  if (msg.includes("breathing")) scoreTracker.breathingAssessment = true;
  if (msg.includes("pulse") || msg.includes("skin") || msg.includes("bleeding")) scoreTracker.circulationAssessment = true;
  if (msg.includes("transport decision")) scoreTracker.priorityTransport = true;
  if (msg.includes("opqrst")) scoreTracker.OPQRST = true;
  if (msg.includes("sample")) scoreTracker.SAMPLE = true;
  if (msg.includes("exam") || msg.includes("focused")) scoreTracker.secondaryAssessment = true;
  if (msg.includes("vitals") || msg.includes("blood pressure")) scoreTracker.vitalSigns = true;
  if (msg.includes("impression")) scoreTracker.fieldImpression = true;
  if (msg.includes("treatment") || msg.includes("intervention")) scoreTracker.treatmentPlan = true;
  if (msg.includes("reassess")) scoreTracker.reassessment = true;
}

function gradeScenario() {
  const mockStart = "18:53";
  const mockEnd = "19:08";
  let score = 0;
  let missed = [];
  let criticalFails = scoreTracker.criticalFails || [];

  for (let key in scoreTracker) {
    if (key !== "criticalFails") {
      if (scoreTracker[key]) score++;
      else missed.push(key);
    }
  }

  function check(key, label) {
    const passed = scoreTracker[key];
    return `<li>${passed ? "✔" : "✘"} ${label}</li>`;
  }

  return `
    <div class="grading-summary">
      <h2>Patient Assessment - Medical (NREMT Skill Sheet)</h2>
      <p><strong>Time Started:</strong> ${mockStart} &nbsp;&nbsp;&nbsp; <strong>Time Ended:</strong> ${mockEnd}</p>
      <h3>Checklist</h3>
      <ul>
        ${check("BSI", "BSI Precautions")}
        ${check("sceneSafety", "Scene Safety")}
        ${check("mechanismInjury", "Nature of Illness")}
        ${check("numberPatients", "Number of Patients")}
        ${check("additionalHelp", "Request Additional Help")}
        ${check("cSpine", "Spinal Precautions")}
        ${check("generalImpression", "General Impression")}
        ${check("responsiveness", "Responsiveness")}
        ${check("chiefComplaint", "Chief Complaint")}
        ${check("airwayAssessment", "Airway Management")}
        ${check("breathingAssessment", "Breathing Assessment")}
        ${check("circulationAssessment", "Circulation Check")}
        ${check("priorityTransport", "Priority Transport Decision")}
        ${check("OPQRST", "OPQRST History")}
        ${check("SAMPLE", "SAMPLE History")}
        ${check("secondaryAssessment", "Secondary Assessment")}
        ${check("vitalSigns", "Vital Signs")}
        ${check("fieldImpression", "Field Impression")}
        ${check("treatmentPlan", "Treatment/Intervention")}
        ${check("reassessment", "Reassessment")}
      </ul>
      <p><strong>Total Points:</strong> ${score} / 48</p>
      <h3>Critical Failures:</h3>
      <ul>${criticalFails.length ? criticalFails.map(c => `<li>✘ ${c}</li>`).join('') : "<li>None</li>"}</ul>
    </div>
  `;
}

export { initializeScoreTracker, updateScoreTracker, gradeScenario, scoreTracker, gradingTemplate };
