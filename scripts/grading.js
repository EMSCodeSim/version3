// scripts/grading.js

export let scoreTracker = {};
window.scoreTracker = scoreTracker;

// Initialize the tracker with all skill keys set to false
export function initializeScoreTracker(gradingTemplate) {
  scoreTracker = {};
  Object.keys(gradingTemplate).forEach(key => scoreTracker[key] = false);
  window.scoreTracker = scoreTracker; // Always keep in sync globally
}

// Grade a skill and keep tracker in sync
export function gradeActionBySkillID(skillID) {
  if (scoreTracker[skillID] !== undefined) {
    scoreTracker[skillID] = true;
    window.scoreTracker = scoreTracker;
  }
}

// Optionally: get scored keys (for summary, etc.)
export function getScoredSkills() {
  return Object.keys(scoreTracker).filter(key => scoreTracker[key]);
}
