const db = firebase.database();

function switchTab(tab) {
  currentTab = tab;
  tab === "review" ? loadReviewResponses() : loadApprovedResponses();
}

function loadReviewResponses() {
  db.ref("hardcodeReview").once("value").then(snapshot => {
    renderResponses(snapshot.val(), true);
  });
}

function loadApprovedResponses() {
  db.ref("hardcodedResponses").once("value").then(snapshot => {
    renderResponses(snapshot.val(), false);
  });
}

function renderResponses(data, isReview) {
  const container = document.getElementById("response-list");
  container.innerHTML = "";

  if (!data) {
    container.innerHTML = "<p>No responses found.</p>";
    return;
  }

  Object.entries(data).forEach(([id, entry]) => {
    const div = document.createElement("div");
    div.className = "response-block";

    const q = entry.question || entry.userQuestion || "N/A";
    const a = entry.response || entry.aiResponse || "";
    const role = entry.role || "Patient";
    const triggerFileBase64 = entry.triggerFile || "";
    const triggerType = entry.triggerFileType || "";

    div.innerHTML = `
      <p><b>Q:</b> ${q}</p>
      <textarea>${a}</textarea><br>
      <select>
        <option value="Patient" ${role === "Patient" ? "selected" : ""}>Patient</option>
        <option value="Proctor" ${role === "Proctor" ? "selected" : ""}>Proctor</option>
      </select><br>
      <input type="file" class="trigger-upload" accept="image/*,audio/*" /><br>
      <div class="trigger-preview">
        ${triggerType === "image" ? `<img src="${triggerFileBase64}" style="max-height:100px;">` : ""}
        ${triggerType === "audio" ? `<audio controls src="${triggerFileBase64}"></audio>` : ""}
      </div>
      ${isReview
        ? `<button onclick="approveReview('${id}', this)">✅ Approve</button>
           <button onclick="deleteReview('${id}')">🗑 Delete</button>`
        : `<button onclick="saveApproved('${id}', this)">💾 Save</button>
           <button onclick="deleteApproved('${id}')">🗑 Delete</button>`}
    `;

    container.appendChild(div);
  });
}

async function approveReview(id, button) {
  const block = button.closest(".response-block");
  const text = block.querySelector("textarea").value;
  const role = block.querySelector("select").value;
  const fileInput = block.querySelector(".trigger-upload");
  const file = fileInput?.files?.[0];

  const snapshot = await db.ref("hardcodeReview/" + id).once("value");
  const q = snapshot.val().question || snapshot.val().userQuestion;

  const voice = role === "Proctor" ? "shimmer" : "onyx";

  const ttsRes = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer YOUR_OPENAI_API_KEY`
    },
    body: JSON.stringify({
      model: "tts-1",
      voice,
      input: text
    })
  });

  const ttsBlob = await ttsRes.blob();
  const ttsBase64 = await new Promise(resolve => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result.split(',')[1]);
    reader.readAsDataURL(ttsBlob);
  });

  let triggerFile = "", triggerFileType = "";

  const saveToFirebase = () => {
    const newEntry = {
      question: q,
      response: text,
      role,
      ttsAudio: ttsBase64,
      triggerFile,
      triggerFileType
    };
    db.ref("hardcodedResponses").push(newEntry);
    db.ref("hardcodeReview/" + id).remove().then(() => {
      alert("Approved and TTS saved.");
      loadReviewResponses();
    });
  };

  if (file) {
    const reader = new FileReader();
    reader.onload = () => {
      triggerFile = reader.result;
      triggerFileType = file.type.startsWith("image") ? "image" : "audio";
      saveToFirebase();
    };
    reader.readAsDataURL(file);
  } else {
    saveToFirebase();
  }
}

function deleteReview(id) {
  if (confirm("Delete this review?")) {
    db.ref("hardcodeReview/" + id).remove().then(loadReviewResponses);
  }
}

function saveApproved(id, button) {
  const block = button.closest(".response-block");
  const text = block.querySelector("textarea").value;
  const role = block.querySelector("select").value;
  const fileInput = block.querySelector(".trigger-upload");
  const file = fileInput?.files?.[0];

  const update = (triggerFile = "", triggerFileType = "") => {
    const updateData = { response: text, role };
    if (triggerFile) updateData.triggerFile = triggerFile;
    if (triggerFileType) updateData.triggerFileType = triggerFileType;

    db.ref("hardcodedResponses/" + id).update(updateData).then(() => {
      alert("Saved.");
      loadApprovedResponses();
    });
  };

  if (file) {
    const reader = new FileReader();
    reader.onload = () => {
      const type = file.type.startsWith("image") ? "image" : "audio";
      update(reader.result, type);
    };
    reader.readAsDataURL(file);
  } else {
    update();
  }
}

function deleteApproved(id) {
  if (confirm("Delete this approved response?")) {
    db.ref("hardcodedResponses/" + id).remove().then(loadApprovedResponses);
  }
}

// Initialize with approved
switchTab("approved");
