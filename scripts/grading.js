// grading.js

window.scoreTracker = window.scoreTracker || {};

window.initializeScoreTracker = function(gradingTemplate) {
  window.scoreTracker = {};
  Object.keys(gradingTemplate).forEach(key => window.scoreTracker[key] = false);
};

window.gradeActionBySkillID = function(skillID) {
  if (window.scoreTracker[skillID] !== undefined) {
    window.scoreTracker[skillID] = true;
  }
};
