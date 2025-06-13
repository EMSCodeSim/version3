// scripts/grading.js

// Ensure scoreTracker exists globally
if (!window.scoreTracker) window.scoreTracker = {};
export let scoreTracker = window.scoreTracker;


// Always use the global object
export let scoreTracker = window.scoreTracker;

// Initialize the tracker with all skill keys set to false
export function initializeScoreTracker(gradingTemplate) {
  window.scoreTracker = {};
  Object.keys(gradingTemplate).forEach(key => window.scoreTracker[key] = false);
  scoreTracker = window.scoreTracker; // keep reference updated
}

// Grade a skill and keep tracker in sync
export function gradeActionBySkillID(skillID) {
  if (window.scoreTracker && window.scoreTracker[skillID] !== undefined) {
    window.scoreTracker[skillID] = true;
    scoreTracker = window.scoreTracker;
  }
}

// Optionally: get scored keys (for summary, etc.)
export function getScoredSkills() {
  return Object.keys(window.scoreTracker).filter(key => window.scoreTracker[key]);
}
