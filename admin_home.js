document.addEventListener("DOMContentLoaded", async () => {
  const approvedContainer = document.getElementById("approved-container");

  function getSkillSheetIDFromTags(tags) {
    if (!tags || !Array.isArray(tags)) return null;

    const tagMap = {
      pulse: "EMT-B-MED-19",
      bp: "EMT-B-MED-20",
      respirations: "EMT-B-MED-21",
      oxygen: "EMT-B-MED-36",
      aspirin: "EMT-B-MED-37",
      glucose: "EMT-B-MED-37",
      avpu: "EMT-B-MED-15",
      general_impression: "EMT-B-MED-13",
      transport_decision: "EMT-B-MED-33",
      onset: "EMT-B-MED-25",
      quality: "EMT-B-MED-26",
      radiation: "EMT-B-MED-27",
      severity: "EMT-B-MED-28",
      time: "EMT-B-MED-29",
      allergies: "EMT-B-MED-30",
      medications: "EMT-B-MED-31",
      history: "EMT-B-MED-32",
      chief_complaint: "EMT-B-MED-24",
      interventions: "EMT-B-MED-35"
    };

    for (const tag of tags) {
      if (tagMap[tag.toLowerCase()]) {
        return tagMap[tag.toLowerCase()];
      }
    }

    return null;
  }

  async function fetchApprovedResponses() {
    const snapshot = await firebase.database().ref("hardcodedResponses").once("value");
    return snapshot.val() || {};
  }

  async function updateWithGPTTagsAndScore(id, entry) {
    try {
      const response = await fetch("/.netlify/functions/gpt_tags_score", {
        method: "POST",
        body: JSON.stringify({
          userInput: entry.question,
          answer: entry.response
        })
      });

      const raw = await response.text();
      console.log("🔎 GPT raw output:", raw);

      const data = JSON.parse(raw);

      // Fallback: fill in skillSheetID if missing
      if (!data.skillSheetID) {
        data.skillSheetID = getSkillSheetIDFromTags(data.tags);
        console.log("📌 Fallback skillSheetID applied:", data.skillSheetID);
      }

      const updateFields = {
        ...entry,
        tags: data.tags,
        scoreCategory: data.scoreCategory,
        points: data.points,
        criticalFail: data.criticalFail,
        skillSheetID: data.skillSheetID
      };

      await firebase.database().ref(`hardcodedResponses/${id}`).set(updateFields);
      alert("✅ GPT tags and scoring added!");
    } catch (err) {
      console.error("❌ Error parsing GPT scoring:", err);
      alert("❌ GPT scoring failed");
    }
  }

  function createResponseCard(id, data) {
    const div = document.createElement("div");
    div.className = "response-card";
    div.innerHTML = `
      <strong>Q:</strong> ${data.question || "—"}<br>
      <strong>A:</strong> ${data.response || "—"}<br>
      <strong>Role:</strong> ${data.role || "patient"}<br>
      <strong>Tags:</strong> ${data.tags ? data.tags.join(", ") : "—"}<br>
      <strong>Score Category:</strong> ${data.scoreCategory || "—"}<br>
      <strong>Points:</strong> ${data.points ?? "—"}<br>
      <strong>Critical Fail:</strong> ${data.criticalFail ? "Yes" : "No"}<br>
      <strong>SkillSheetID:</strong> ${data.skillSheetID || "—"}<br>
      <strong>Trigger:</strong> ${data.trigger || "—"}<br>
      <audio controls src="${data.ttsAudio || ""}"></audio><br><br>
      <button onclick="location.href='review_manager.html?question=' + encodeURIComponent('${id}')">✏️ Review</button>
      <button onclick="updateGPT('${id}')">🛠 Update This Response</button>
    `;
    approvedContainer.appendChild(div);
  }

  window.updateGPT = async function(id) {
    const snapshot = await firebase.database().ref(`hardcodedResponses/${id}`).once("value");
    const entry = snapshot.val();
    if (entry) {
      await updateWithGPTTagsAndScore(id, entry);
      location.reload(); // refresh card display
    }
  };

  const approved = await fetchApprovedResponses();
  for (const [id, data] of Object.entries(approved)) {
    createResponseCard(id, data);
  }

  document.getElementById("update-all").addEventListener("click", async () => {
    const approved = await fetchApprovedResponses();
    for (const [id, entry] of Object.entries(approved)) {
      await updateWithGPTTagsAndScore(id, entry);
    }
    location.reload();
  });
});
