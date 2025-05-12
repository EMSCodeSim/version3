<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>EMS Code Sim – Admin Panel</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      background: #f2f2f2;
      padding: 20px;
    }
    .tabs {
      display: flex;
      gap: 20px;
      margin-bottom: 20px;
    }
    .tabs button {
      padding: 10px 20px;
      cursor: pointer;
    }
    .response-block {
      background: white;
      padding: 15px;
      margin-bottom: 10px;
      border: 1px solid #ccc;
    }
    textarea {
      width: 100%;
      height: 60px;
    }
    select, input[type="text"], input[type="file"] {
      margin: 5px 0;
      width: 100%;
    }
    img {
      max-height: 100px;
      margin-top: 5px;
    }
    audio {
      width: 100%;
      margin-top: 5px;
    }
  </style>
</head>
<body>

  <h1>EMS Code Sim – Admin Panel</h1>

  <div class="tabs">
    <button onclick="switchTab('approved')">✅ Approved</button>
    <button onclick="switchTab('review')">📝 Review</button>
  </div>

  <div id="response-list">Loading...</div>

  <script src="https://www.gstatic.com/firebasejs/9.6.10/firebase-app-compat.js"></script>
  <script src="https://www.gstatic.com/firebasejs/9.6.10/firebase-database-compat.js"></script>

  <script>
    const firebaseConfig = {
      apiKey: "AIzaSyAmpYL8Ywfxkw_h2aMvF2prjiI0m5LYM40",
      authDomain: "ems-code-sim.firebaseapp.com",
      databaseURL: "https://ems-code-sim-default-rtdb.firebaseio.com",
      projectId: "ems-code-sim",
      storageBucket: "ems-code-sim.appspot.com",
      messagingSenderId: "190498607578",
      appId: "1:190498607578:web:4cf6c8e999b027956070e3"
    };
    firebase.initializeApp(firebaseConfig);

    let currentTab = "approved";

    function switchTab(tab) {
      currentTab = tab;
      tab === "approved" ? loadApprovedResponses() : loadReviewResponses();
    }

    function loadApprovedResponses() {
      firebase.database().ref("hardcodedResponses").once("value").then(snapshot => {
        renderResponses(snapshot.val(), false);
      });
    }

    function loadReviewResponses() {
      firebase.database().ref("hardcodeReview").once("value").then(snapshot => {
        renderResponses(snapshot.val(), true);
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
            ${triggerType === "image" ? `<img src="${triggerFileBase64}">` : ""}
            ${triggerType === "audio" ? `<audio controls src="${triggerFileBase64}"></audio>` : ""}
          </div>
          ${isReview
            ? `<button onclick="approveReview('${id}', this)">✅ Approve</button>
               <button onclick="deleteReview('${id}')">🗑 Delete</button>`
            : `<button onclick="saveApproved('${id}', this)">💾 Save</button>
               <button onclick="deleteApproved('${id}')">🗑 Delete</button>`
          }
        `;

        container.appendChild(div);
      });
    }

    function approveReview(id, button) {
      const block = button.closest(".response-block");
      const text = block.querySelector("textarea").value;
      const role = block.querySelector("select").value;
      const fileInput = block.querySelector(".trigger-upload");
      const file = fileInput.files[0];

      const ref = firebase.database().ref("hardcodeReview/" + id);
      ref.once("value").then(snapshot => {
        const q = snapshot.val().question || snapshot.val().userQuestion;

        const uploadAndSave = (triggerFile = "", triggerFileType = "") => {
          const obj = {
            question: q,
            response: text,
            role,
            triggerFile,
            triggerFileType
          };
          firebase.database().ref("hardcodedResponses").push(obj);
          ref.remove().then(() => {
            alert("Approved.");
            loadReviewResponses();
          });
        };

        if (file) {
          const reader = new FileReader();
          reader.onload = () => {
            const type = file.type.startsWith("image") ? "image" : "audio";
            uploadAndSave(reader.result, type);
          };
          reader.readAsDataURL(file);
        } else {
          uploadAndSave();
        }
      });
    }

    function deleteReview(id) {
      if (confirm("Delete this review?")) {
        firebase.database().ref("hardcodeReview/" + id).remove().then(loadReviewResponses);
      }
    }

    function saveApproved(id, button) {
      const block = button.closest(".response-block");
      const text = block.querySelector("textarea").value;
      const role = block.querySelector("select").value;
      const fileInput = block.querySelector(".trigger-upload");
      const file = fileInput.files[0];

      const updateRef = (triggerFile = "", triggerFileType = "") => {
        const ref = firebase.database().ref("hardcodedResponses/" + id);
        ref.update({
          response: text,
          role,
          ...(triggerFile && { triggerFile }),
          ...(triggerFileType && { triggerFileType })
        }).then(() => alert("Saved."));
      };

      if (file) {
        const reader = new FileReader();
        reader.onload = () => {
          const type = file.type.startsWith("image") ? "image" : "audio";
          updateRef(reader.result, type);
        };
        reader.readAsDataURL(file);
      } else {
        updateRef();
      }
    }

    function deleteApproved(id) {
      if (confirm("Delete this approved response?")) {
        firebase.database().ref("hardcodedResponses/" + id).remove().then(loadApprovedResponses);
      }
    }

    // Load default tab
    switchTab("approved");
  </script>

</body>
</html>
