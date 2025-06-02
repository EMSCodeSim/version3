// checklist.js

export const skillSheetIDToStatusID = {
  verbalizesPPEPrecautions: "status-1",
  verbalizesSceneSafety: "status-2",
  determinesMOIorNOI: "status-3",
  determinesNumberOfPatients: "status-4",
  requestsAdditionalEMS: "status-5",
  considersCSpineStabilization: "status-6",
  verbalizesGeneralImpression: "status-7",
  determinesResponsiveness: "status-8",
  determinesChiefComplaint: "status-9",
  assessesAirway: "status-10",
  assessesBreathing: "status-10",
  insertsAirwayAdjunct: "status-10",
  assuresAdequateVentilation: "status-10",
  initiatesOxygenTherapy: "status-11",
  managesInjuryBreathing: "status-10",
  assessesPulse: "status-12",
  assessesSkin: "status-12",
  assessesAndControlsBleeding: "status-12",
  initiatesShockManagement: "status-12",
  identifiesPriorityTransportDecision: "status-13",
  obtainsOPQRSTHistory: "status-14",
  obtainsProvocation: "status-15",
  obtainsQuality: "status-16",
  obtainsRadiation: "status-17",
  obtainsSeverity: "status-18",
  obtainsTime: "status-19",
  obtainsSAMPLEHistory: "status-20",
  obtainsAllergies: "status-21",
  obtainsMedications: "status-22",
  obtainsPastMedicalHistory: "status-23",
  obtainsLastOralIntake: "status-24",
  obtainsEventsLeading: "status-25",
  assessesAffectedBodySystem: "status-26",
  obtainsBaselineBP: "status-27",
  obtainsBaselineHR: "status-28",
  obtainsBaselineRR: "status-29",
  verbalizesFieldImpression: "status-30",
  verbalizesInterventions: "status-31",
  reassessesPatient: "status-32"
};

/**
 * Checks off the correct item in the checklist for the given skillSheetID.
 * @param {string} skillSheetID 
 */
export function markSkillSheetStep(skillSheetID) {
  const statusId = skillSheetIDToStatusID[skillSheetID];
  if (!statusId) return;
  const el = document.getElementById(statusId);
  if (el && !el.textContent.includes("✔")) {
    el.textContent = "✔";
    el.classList.add("checked");
  }
}
