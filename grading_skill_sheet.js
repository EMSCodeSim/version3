// grading_skill_sheet.js
window.skillSheetScoring = {
  // Scene Size-Up & Primary
  ppeBsi: { label: "PPE/BSI", points: 1 },
  sceneSafety: { label: "Scene Safety", points: 1 },
  determinesMOIorNOI: { label: "Determines MOI/NOI", points: 1 },
  determinesNumberOfPatients: { label: "Determines Number of Patients", points: 1 },
  requestsAdditionalResources: { label: "Requests Additional Resources", points: 1 },
  considersCSpine: { label: "Considers C-Spine Stabilization", points: 1 },

  generalImpression: { label: "General Impression", points: 1 },
  determinesResponsiveness: { label: "Determines Responsiveness/LOC", points: 1 },
  chiefComplaint: { label: "Chief Complaint", points: 1 },
  airway: { label: "Assesses Airway/Breathing", points: 1 },
  adequateVentilation: { label: "Assures Adequate Ventilation", points: 1 },
  oxygenTherapy: { label: "Initiates Oxygen Therapy", points: 1 },
  managesInjuriesToAirway: { label: "Manages Life Threats", points: 1 },
  circulation: { label: "Assesses Circulation", points: 1 },
  controlsMajorBleeding: { label: "Controls Major Bleeding", points: 1 },
  checksPulse: { label: "Checks Pulse", points: 1 },
  skinAssessment: { label: "Assesses Skin (color, temp, condition)", points: 1 },
  shockManagement: { label: "Initiates Shock Management", points: 1 },
  patientPriority: { label: "Identifies Patient Priority/Transport Decision", points: 1 },

  // OPQRST (each 1 point)
  opqrstOnset: { label: "OPQRST: Onset", points: 1 },
  opqrstProvocation: { label: "OPQRST: Provocation", points: 1 },
  opqrstQuality: { label: "OPQRST: Quality", points: 1 },
  opqrstRadiation: { label: "OPQRST: Radiation", points: 1 },
  opqrstSeverity: { label: "OPQRST: Severity", points: 1 },
  opqrstTime: { label: "OPQRST: Time", points: 1 },

  // SAMPLE (each 1 point)
  sampleSigns: { label: "SAMPLE: Signs/Symptoms", points: 1 },
  sampleAllergies: { label: "SAMPLE: Allergies", points: 1 },
  sampleMedications: { label: "SAMPLE: Medications", points: 1 },
  samplePastHistory: { label: "SAMPLE: Past Medical History", points: 1 },
  sampleLastIntake: { label: "SAMPLE: Last Oral Intake", points: 1 },
  sampleEvents: { label: "SAMPLE: Events Leading Up", points: 1 },

  // Secondary Assessment/Vitals
  assessesAffectedBodyPart: { label: "Assesses Affected Body Part/System", points: 1 },
  obtainsBaselineVitals: { label: "Obtains Baseline Vitals (BP, P, R)", points: 1 },

  managesSecondaryInjuries: { label: "Manages Secondary Injuries/Conditions", points: 1 },
  verbalizesReassessment: { label: "Verbalizes Reassessment/Report", points: 1 },

  // Common alternatives for mapping legacy keys
  baselineVitals: { label: "Obtains Baseline Vitals", points: 1 },
  reassessPatient: { label: "Reassess Patient", points: 1 },
  determineTransport: { label: "Determine Transport", points: 1 }
};
