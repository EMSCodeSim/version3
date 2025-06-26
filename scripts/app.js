// app.js

// --- Globals ---
let scenarioData = {};
let currentScenario = null;
let currentSkillSheet = null;
let learningMode = false;

// --- UI Utilities ---
function showSpinner() {
    const s = document.getElementById("loadingSpinner");
    if (s) s.style.display = "block";
}
function hideSpinner() {
    const s = document.getElementById("loadingSpinner");
    if (s) s.style.display = "none";
}

function showMessage(text, type = "ai") {
    const chat = document.getElementById("chatArea");
    if (!chat) return;
    const div = document.createElement("div");
    div.className = type === "user" ? "chat-message user" : "chat-message ai";
    div.innerHTML = text;
    chat.appendChild(div);
    chat.scrollTop = chat.scrollHeight;
}

function clearChat() {
    const chat = document.getElementById("chatArea");
    if (chat) chat.innerHTML = "";
}

// --- Scenario Loader ---
async function loadScenario(scenarioName) {
    showSpinner();
    try {
        currentScenario = scenarioName;
        scenarioData = {};
        // Load config
        const configResp = await fetch(`scenarios/${scenarioName}/config.json`);
        if (!configResp.ok) throw new Error("Could not load config.json");
        scenarioData.config = await configResp.json();

        // Load patient
        if (scenarioData.config.patientFile) {
            const patientResp = await fetch(`scenarios/${scenarioName}/${scenarioData.config.patientFile}`);
            scenarioData.patient = await patientResp.text();
        }
        // Load dispatch
        if (scenarioData.config.dispatchFile) {
            const dispatchResp = await fetch(`scenarios/${scenarioName}/${scenarioData.config.dispatchFile}`);
            scenarioData.dispatch = await dispatchResp.text();
        }
        // Load skill sheet if present
        if (scenarioData.config.skillSheetFile) {
            const sheetResp = await fetch(`scenarios/${scenarioName}/${scenarioData.config.skillSheetFile}`);
            scenarioData.skillSheet = await sheetResp.json();
        }

        clearChat();
        if (scenarioData.dispatch) {
            showMessage(`<strong>Dispatch:</strong> ${scenarioData.dispatch}`, "ai");
        }
        // Show patient image if present
        if (scenarioData.config.patientImage) {
            showPatientImage(`scenarios/${scenarioName}/${scenarioData.config.patientImage}`);
        } else {
            showPatientImage(null);
        }

        // Reset grading
        if (window.resetSkillSheet) window.resetSkillSheet();

        hideSpinner();
    } catch (err) {
        hideSpinner();
        showMessage(`<span style="color:red">Failed to load scenario: ${err.message}</span>`, "ai");
    }
}

function showPatientImage(imgPath) {
    const imgDiv = document.getElementById("patientImage");
    if (!imgDiv) return;
    imgDiv.innerHTML = "";
    if (imgPath) {
        const img = document.createElement("img");
        img.src = imgPath;
        img.alt = "Patient";
        img.style.width = "100%";
        imgDiv.appendChild(img);
    }
}

// --- User Input/Chat Logic ---
async function handleUserInput(msg) {
    if (!msg.trim()) return;
    showMessage(`<strong>You:</strong> ${msg}`, "user");

    if (!window.routeUserInput || typeof window.routeUserInput !== "function") {
        showMessage(`<span style="color:red">AI processing error: Scenario logic missing (router.js not loaded)</span>`, "ai");
        return;
    }
    try {
        showSpinner();
        const context = {
            scenario: currentScenario,
            config: scenarioData.config,
            patient: scenarioData.patient,
            skillSheet: scenarioData.skillSheet,
            learningMode: learningMode
        };
        const result = await window.routeUserInput(msg, context);
        showMessage(result.response || "(No response)", "ai");

        // Grading logic (if result.scoreCategory present)
        if (window.gradeSkillSheet && result.scoreCategory) {
            window.gradeSkillSheet(result.scoreCategory);
        }
        // Show patient photo/audio if present in result
        if (result.triggerPhoto) {
            showPatientImage(`scenarios/${currentScenario}/${result.triggerPhoto}`);
        }
        // TODO: handle triggerAudio, etc.

    } catch (err) {
        showMessage(`<span style="color:red">AI processing error: ${err.message}</span>`, "ai");
    } finally {
        hideSpinner();
    }
}

// --- UI Event Listeners ---
document.addEventListener("DOMContentLoaded", function () {
    // Scenario select
    const scenarioPicker = document.getElementById("scenarioPicker");
    if (scenarioPicker) {
        scenarioPicker.addEventListener("change", function () {
            if (this.value) loadScenario(this.value);
        });
    }
    // Start button
    const startBtn = document.getElementById("startScenarioBtn");
    if (startBtn) {
        startBtn.onclick = function () {
            if (scenarioPicker && scenarioPicker.value) loadScenario(scenarioPicker.value);
        };
    }
    // Send button and Enter key
    const sendBtn = document.getElementById("sendBtn");
    const inputBox = document.getElementById("inputBox");
    if (sendBtn && inputBox) {
        sendBtn.onclick = function () {
            const msg = inputBox.value.trim();
            if (msg) {
                handleUserInput(msg);
                inputBox.value = "";
            }
        };
        inputBox.addEventListener("keydown", function (e) {
            if (e.key === "Enter") sendBtn.click();
        });
    }
    // Mic button (voice)
    const micBtn = document.getElementById("micBtn");
    if (micBtn) {
        micBtn.onclick = function () {
            if (window.startMicTranscription) {
                window.startMicTranscription((text) => {
                    if (text) handleUserInput(text);
                });
            } else {
                showMessage("<em>Voice input coming soon...</em>", "ai");
            }
        };
    }
    // Learning mode toggle
    const lm = document.getElementById("learningModeToggle");
    if (lm) {
        lm.addEventListener("change", function () {
            learningMode = !!this.checked;
            if (window.toggleLearningMode) window.toggleLearningMode(learningMode);
        });
    }
});

// --- Expose to window for external trigger if needed
window.loadScenario = loadScenario;
window.handleUserInput = handleUserInput;

