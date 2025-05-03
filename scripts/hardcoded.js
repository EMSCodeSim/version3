// hardcoded.js
function normalize(text) {
  return text.toLowerCase().replace(/[^\w\s]/gi, '').replace(/\s+/g, ' ').trim();
}

function similarity(a, b) {
  const longer = a.length > b.length ? a : b;
  const shorter = a.length > b.length ? b : a;
  const longerLength = longer.length;
  if (longerLength === 0) return 1.0;
  return (longerLength - editDistance(longer, shorter)) / parseFloat(longerLength);
}

function editDistance(a, b) {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

export function checkHardcodedResponse(message, hardcodedResponses) {
  if (!hardcodedResponses || typeof hardcodedResponses !== 'object') return null;

  const userInput = normalize(message);
  let bestMatch = null;
  let highestScore = 0.0;

  for (const key in hardcodedResponses) {
    const stored = hardcodedResponses[key];
    const storedInput = normalize(stored?.userQuestion || '');
    if (userInput === storedInput) {
      console.log("✅ Exact hardcoded match found:", stored.userQuestion);
      return stored;
    }
    const score = similarity(userInput, storedInput);
    if (score > highestScore) {
      highestScore = score;
      bestMatch = stored;
    }
  }

  if (highestScore >= 0.85) {
    console.log(`✅ Fuzzy hardcoded match found (score ${highestScore.toFixed(2)}):`, bestMatch.userQuestion);
    return bestMatch;
  }

  console.log("❌ No hardcoded match (exact or fuzzy).");
  return null;
}
