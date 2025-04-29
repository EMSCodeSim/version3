
EMS Code Sim - GPT Developer Guide
==================================

Project Purpose:
----------------
EMS Code Sim is a web-based EMT training simulator that provides NREMT-style patient scenarios. 
It uses AI to simulate realistic patient and proctor conversations. The simulator follows the 
NREMT Medical Assessment sheet and provides students feedback after the scenario ends.

Site Features:
--------------
- 15-minute timed simulations with dispatch + patient presentation
- AI-powered responses from either:
  1. Hardcoded Responses
  2. Vector Search via embeddings
  3. GPT-4 Turbo fallback
- Scenario control (Start/End)
- Text-to-speech and microphone support
- Firebase Realtime Database integration for:
  - hardcodedResponses
  - error_logs
  - unknownQuestions (admin)
  - ai_responses_log
- Admin tools to manage unknowns, triggers, and create scenarios

File Structure:
---------------
version3-main/
├── index.html                # Main simulator interface
├── admin_home.html           # Admin landing page with links
├── admin_dashboard.html      # Live dashboard for unknowns/hardcoded/errors
├── hardcode_manager.html     # Admin tool to approve/curate responses
├── admin_errors.html         # Logs all JavaScript/AI errors
├── create_scenario.html      # Instructor scenario builder
├── upload.html               # File upload tool (optional)
│
├── scripts/
│   ├── app.js                # Main frontend logic for AI, buttons, chat display
│   ├── admin.js              # Logic for managing unknowns and hardcoded entries
│
├── netlify/functions/
│   ├── gpt4-turbo.js         # GPT-4 Turbo Netlify function for fallback responses
│   ├── vector-search.js      # Matches user message to closest embedded question
│   ├── saveTTS.js            # (optional) Saves TTS audio clips
│
├── scenarios/
│   └── chest_pain_002/
│       ├── dispatch.txt      # Dispatch information for the case
│       ├── patient.txt       # Patient history and info
│       ├── scene1.PNG        # Image displayed at scene start
│
├── styles/
│   └── style.css             # All UI styles for buttons, layout, bubbles
│
├── embeddings.json           # Vector-based similarity data (auto-generated)
├── generate_embeddings.py    # Script to create embeddings from text prompts
├── GPT_README.txt            # This file: full project documentation
├── package.json              # For Netlify function dependencies
├── netlify.toml              # Redirects and build settings for Netlify

AI Behavior Logic:
------------------
When a user sends a message:
1. `checkHardcodedResponse()` checks if the exact or fuzzy match exists in Firebase `hardcodedResponses`
2. If not found, `vector-search.js` is called via `/api/vector-search` to find a semantically similar match
3. If no vector result, fallback to GPT-4 Turbo via `/api/gpt4-turbo`
4. All responses are logged in `ai_responses_log`
5. All user questions that fail to match are logged in `unknownQuestions` (for admin review)

Admin Flow:
-----------
- Admin can review unknown questions using `hardcode_manager.html`
- Approved answers are saved to `hardcodedResponses`
- If triggers are set (like breath sounds or image), they are saved to `triggers`
- `admin_dashboard.html` displays total unknowns, hardcoded entries, trigger count, and last error

How to Regenerate Embeddings:
-----------------------------
Run:
  export OPENAI_API_KEY=your-key
  python generate_embeddings.py

This script updates `embeddings.json` used by `vector-search.js` for semantic matching.

To Deploy:
----------
1. Upload to Netlify
2. Set the following environment variable:
   - OPENAI_API_KEY = your secret key

GPT Notes:
----------
You can use this README as a system prompt or file context to resume future updates.
GPT should always:
- Look first in hardcodedResponses
- Fallback to vector if enabled
- Fallback to GPT-4 Turbo last
- Log all errors to Firebase under `error_logs`

END OF FILE.
