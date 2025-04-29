// Updated app.js - Corrected Message Flow: Hardcode -> Vector -> GPT-4 Turbo fallback

async function processUserMessage(message) {
    console.log("Checking hardcoded responses...");
    let hardcodeResponse = checkHardcodedResponse(message);
    
    if (hardcodeResponse) {
        console.log("Hardcode match found!");
        displayChatResponse(hardcodeResponse);
        return;
    }

    console.log("No hardcode match, checking vector similarity...");
    let vectorResponse = await getVectorResponse(message);

    if (vectorResponse) {
        console.log("Vector match found!");
        displayChatResponse(vectorResponse);
        return;
    }

    console.log("No vector match, falling back to GPT-4 Turbo AI...");
    let aiResponse = await getAIResponseGPT4Turbo(message);

    if (aiResponse) {
        console.log("Received AI response.");
        logAIResponseToDatabase(message, aiResponse);
        displayChatResponse(aiResponse);
    } else {
        console.error("No response received from AI.");
        displayChatResponse("Sorry, I encountered an error processing your request.");
    }
}

// Ensure these functions are correctly implemented:

function checkHardcodedResponse(message) {
    // Your exact match logic here, returning response or null
    return hardcodedResponses[message] || null;
}

async function getVectorResponse(message) {
    // Your vector similarity search logic, returning best response or null
    try {
        const response = await fetch('/api/vector-search', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ query: message })
        });

        const data = await response.json();
        return data.match || null;
    } catch (error) {
        console.error("Vector search error:", error);
        return null;
    }
}

async function getAIResponseGPT4Turbo(message) {
    try {
        const response = await fetch('/api/gpt4-turbo', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ prompt: message })
        });

        const data = await response.json();
        return data.reply || null;
    } catch (error) {
        console.error("AI request error:", error);
        return null;
    }
}

function logAIResponseToDatabase(userMessage, aiResponse) {
    // Your Firebase logging logic
    firebase.database().ref('ai_responses_log').push({
        userMessage,
        aiResponse,
        timestamp: Date.now()
    });
}

function displayChatResponse(response) {
    // Your UI display logic
    const chatBox = document.getElementById("chat-box");
    chatBox.innerHTML += `<div class="response">${response}</div>`;
    chatBox.scrollTop = chatBox.scrollHeight;
}
