
EMS CODE SIM - SYSTEM OVERVIEW AND MAINTENANCE GUIDE
======================================================

PROJECT PURPOSE:
----------------
This project simulates NREMT patient encounters for EMT students, combining hardcoded responses, vector similarity search, and GPT-4 Turbo fallback.
The goal is to simulate patient interviews, scenario-based learning, and test readiness in a real-time interactive format.

CURRENT FILE STRUCTURE:
------------------------

version3-main/
├── admin.html                        # Admin homepage
├── admin_errors.html                 # Displays errors logged to Firebase
├── admin_home.html                   # Admin control panel (may link to modules)
├── create_scenario.html              # UI to create new simulation scenarios
├── generate_embeddings.py            # Python script for vector data embedding (used in vector search)
├── hardcode_manager.html             # UI tool to manage and push hardcoded responses to Firebase
├── index.html                        # Main EMS simulation interface
├── netlify.toml                      # Netlify build + redirect rules for functions
├── package.json                      # Project dependencies (for Netlify or local)
├── upload.html                       # File upload page for admin usage
│
├── netlify/functions/
│   ├── chat.js                       # (Not in use, legacy or alternate chatbot handler)
│   ├── embed.js                      # Vector embedding setup (GPT or OpenAI-based)
│   ├── saveTTS.js                    # Future: Save TTS-generated audio
│   ├── tts.js                        # Future: Call to TTS-1 for voice synthesis
│   ├── gpt4-turbo.js                 # Local fallback handler for GPT-4 Turbo responses
│   ├── vector-search.js              # Local similarity match using keywords instead of embeddings
│
├── scenarios/chest_pain_002/
│   ├── dispatch.txt                  # Text for dispatch call
│   ├── patient.txt                   # Text with detailed patient case description
│   ├── chat_log.json                 # Chat log storage (can be used for analysis or replay)
│   ├── scene1.PNG                    # Patient image to show after dispatch
│
├── scripts/
│   ├── app.js                        # Core frontend logic — handles all user input, logic, Firebase, and GPT calls
│   ├── admin.js                      # Used in admin interfaces
│
├── styles/
│   ├── style.css                     # Global UI styling


KEY COMPONENTS & LINKAGE:
-------------------------

[1] app.js (main logic file)
    - Loads dispatch and patient info from scenarios
    - Loads hardcodedResponses from Firebase (/hardcodedResponses)
    - Defines full chatbot logic:
        - checkHardcodedResponse()
        - getVectorResponse()
        - getAIResponseGPT4Turbo()
        - displayChatResponse()
        - logErrorToDatabase()
    - Also contains global error catchers
    - Calls:
        - /api/vector-search (Netlify)
        - /api/gpt4-turbo (Netlify)

[2] netlify/functions/gpt4-turbo.js
    - Simulated GPT-4 Turbo fallback using keyword checks
    - Returns a simple text-based reply via JSON: { reply: "..." }

[3] netlify/functions/vector-search.js
    - Simulates vector similarity by checking keywords in a static array
    - Returns best match (if any)

[4] hardcode_manager.html
    - Allows admin to enter question/answer pairs
    - Saves them directly to Firebase at: /hardcodedResponses
    - On load, it fetches and displays existing Firebase entries

[5] admin_errors.html
    - Reads Firebase /error_logs
    - Displays table of all error messages and timestamps (live update)


FIREBASE CONFIGURATION:
------------------------
- Database URL: https://ems-code-sim-default-rtdb.firebaseio.com
- Firebase used for:
    - /hardcodedResponses         -> Text match fallback
    - /ai_responses_log           -> AI replies logged after GPT call
    - /error_logs                 -> Captures site exceptions and backend issues

- All Firebase calls are made using firebase-app-compat.js and firebase-database-compat.js (v9.22.1)


CURRENTLY FUNCTIONAL:
-----------------------
✔ Buttons: Start, End, Send, Mic all trigger correct JS
✔ Dispatch and patient info load from .txt files
✔ Chat UI shows AI and patient responses
✔ Hardcoded responses load from Firebase
✔ Vector fallback working via /api/vector-search
✔ GPT fallback working via /api/gpt4-turbo
✔ Firebase logs errors and AI replies
✔ Error viewer admin panel works
✔ Hardcode manager is synced and saves to Firebase

IN DEVELOPMENT / FUTURE UPGRADES:
----------------------------------
- Improve GPT fallback randomness and variety
- Add voice playback (TTS-1) using saveTTS.js
- Add audio input (mic-to-text) full simulation
- Add multi-patient linking (scenario branching)
- Export admin tools (hardcodedResponses, error logs) to CSV
- Scenario folder builder for multiple case types (chest pain, SOB, AMS...)
- Add real-time scenario scoring against NREMT skill sheet
- Offline fallback mode with cached responses
- GPT_README.txt auto-regeneration using build script

DEPENDENCIES:
--------------
- Firebase (Realtime DB)
- Netlify serverless functions (Node.js)
- GPT fallback (via POST to /api/gpt4-turbo)
- Vector search (via POST to /api/vector-search)
- Local scenario .txt files (dispatch/patient)


MAINTENANCE TIPS:
------------------
- Keep /netlify/functions paths in sync with /api/ redirects in netlify.toml
- Watch Firebase limits for realtime logging
- Use admin_errors.html during testing/debugging
- Update scenarioPath variable in app.js to load new scenario folders
- Add entries via hardcode_manager.html to immediately affect app logic

