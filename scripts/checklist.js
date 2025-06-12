// scripts/checklist.js

import { scoreTracker } from './grading.js';

const SKILL_MAP = [
  { id: "ppeBsi", el: "EMT-B-MED-1" },
  { id: "sceneSafety", el: "EMT-B-MED-2" },
  { id: "determinesMOIorNOI", el: "EMT-B-MED-3" },
  { id: "determinesNumberOfPatients", el: "EMT-B-MED-4" },
  { id: "requestsAdditionalResources", el: "EMT-B-MED-5" },
  { id: "considersCSpine", el: "EMT-B-MED-6" },
  { id: "generalImpression", el: "EMT-B-MED-7" },
  { id: "determinesResponsiveness", el: "EMT-B-MED-8" },
  { id: "chiefComplaint", el: "EMT-B-MED-9" },
  { id: "airway", el: "EMT-B-MED-10" },
  { id: "oxygenTherapy", el: "EMT-B-MED-11" },
  { id: "circulation", el: "EMT-B-MED-12" },
  { id: "patientPriority", el: "EMT-B-MED-13" },
  { id: "opqrstOnset", el: "EMT-B-MED-14" },
  { id: "opqrstProvocation", el: "EMT-B-MED-15" },
  { id: "opqrstQuality", el: "EMT-B-MED-16" },
  { id: "opqrstRadiation", el: "EMT-B-MED-17" },
  { id: "opqrstSeverity", el: "EMT-B-MED-18" },
  { id: "opqrstTime", el: "EMT-B-MED-19" },
  { id: "sampleSigns", el: "EMT-B-MED-20" },
  { id: "sampleAllergies", el: "EMT-B-MED-21" },
  { id: "sampleMedications", el: "EMT-B-MED-22" },
  { id: "samplePastHistory", el: "EMT-B-MED-23" },
  { id: "sampleLastIntake", el: "EMT-B-MED-24" },
  { id: "sampleEvents", el: "EMT-B-MED-25" },
  { id: "assessesAffectedBodyPart", el: "EMT-B-MED-26" },
  { id: "obtainsBaselineVitals", el: "EMT-B-MED-27" },
  { id: "obtainsBaselineVitals", el: "EMT-B-MED-28" },
  { id: "obtainsBaselineVitals", el: "EMT-B-MED-29" },
  { id: "generalImpression", el: "EMT-B-MED-30" },
  { id: "managesSecondaryInjuries", el: "EMT-B-MED-31" },
  { id: "verbalizesReassessment", el: "EMT-B-MED-32" }
];

export function updateSkillChecklistUI() {
  for (const { id, el } of SKILL_MAP) {
    const li = document.getElementById(el);
    if (li && li.querySelector('.status')) {
      li.querySelector('.status').textContent = scoreTracker[id] ? "✅" : "";
    }
  }
}
window.updateSkillChecklistUI = updateSkillChecklistUI;

export function resetSkillChecklistUI() {
  for (const { el } of SKILL_MAP) {
    const li = document.getElementById(el);
    if (li && li.querySelector('.status')) {
      li.querySelector('.status').textContent = "";
    }
  }
}
window.resetSkillChecklistUI = resetSkillChecklistUI;

// On page load, clear and update the checklist
document.addEventListener("DOMContentLoaded", () => {
  resetSkillChecklistUI();
  updateSkillChecklistUI();
});
