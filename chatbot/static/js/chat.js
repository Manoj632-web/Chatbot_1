/**
 * Gemini Chat — Client-side logic
 * Handles message sending, rendering, and UI interactions.
 */

// ============================================
// State & Config
// ============================================
const API_CHAT_URL = '/api/chat/';
const API_CLEAR_URL = '/api/clear/';
let isWaiting = false;

// ============================================
// DOM Elements
// ============================================
const messagesContainer = document.getElementById('messagesContainer');
const messagesWrapper = document.getElementById('messagesWrapper');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const newChatBtn = document.getElementById('newChatBtn');
const welcomeScreen = document.getElementById('welcomeScreen');
const menuToggle = document.getElementById('menuToggle');
const sidebar = document.getElementById('sidebar');

// ============================================
// Initialize
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    // Configure marked.js
    marked.setOptions({
        highlight: function (code, lang) {
            if (lang && hljs.getLanguage(lang)) {
                return hljs.highlight(code, { language: lang }).value;
            }
            return hljs.highlightAuto(code).value;
        },
        breaks: true,
        gfm: true,
    });

    // Load existing messages from the Django template
    loadExistingMessages();

    // Event listeners
    sendBtn.addEventListener('click', sendMessage);
    newChatBtn.addEventListener('click', clearChat);
    messageInput.addEventListener('keydown', handleKeyDown);
    messageInput.addEventListener('input', autoResizeTextarea);

    // Suggestion chips
    document.querySelectorAll('.chip').forEach(chip => {
        chip.addEventListener('click', () => {
            messageInput.value = chip.dataset.prompt;
            sendMessage();
        });
    });

    // Mobile sidebar toggle
    menuToggle.addEventListener('click', toggleSidebar);

    messageInput.focus();
});

// ============================================
// Load Existing Messages
// ============================================
function loadExistingMessages() {
    try {
        const dataEl = document.getElementById('messagesData');
        const messages = JSON.parse(dataEl.textContent);
        if (messages && messages.length > 0) {
            hideWelcomeScreen();
            messages.forEach(msg => {
                appendMessage(msg.role, msg.content, false);
            });
            scrollToBottom();
        }
    } catch (e) {
        console.warn('No existing messages to load.');
    }
}

// ============================================
// Send Message
// ============================================
async function sendMessage() {
    const text = messageInput.value.trim();
    if (!text || isWaiting) return;

    isWaiting = true;
    sendBtn.disabled = true;
    hideWelcomeScreen();

    // Show user message
    appendMessage('user', text);
    messageInput.value = '';
    autoResizeTextarea();
    scrollToBottom();

    // Show typing indicator
    const typingEl = showTypingIndicator();

    try {
        const response = await fetch(API_CHAT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: text }),
        });

        const data = await response.json();

        // Remove typing indicator
        typingEl.remove();

        if (response.ok) {
            appendMessage('assistant', data.response);
        } else {
            appendMessage('assistant', `⚠️ Error: ${data.error || 'Something went wrong.'}`, false, true);
        }
    } catch (err) {
        typingEl.remove();
        appendMessage('assistant', `⚠️ Network error: ${err.message}`, false, true);
    }

    isWaiting = false;
    sendBtn.disabled = false;
    messageInput.focus();
    scrollToBottom();
}

// ============================================
// Clear Chat
// ============================================
async function clearChat() {
    try {
        await fetch(API_CLEAR_URL, { method: 'POST' });
    } catch (e) {
        console.error('Failed to clear chat on server:', e);
    }

    // Remove all messages from DOM
    const messages = messagesWrapper.querySelectorAll('.message');
    messages.forEach(m => m.remove());

    // Show welcome screen again
    showWelcomeScreen();
    messageInput.focus();
}

// ============================================
// DOM Helpers
// ============================================
function appendMessage(role, content, animate = true, isError = false) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${role === 'user' ? 'user-message' : 'ai-message'}`;
    if (!animate) msgDiv.style.animation = 'none';

    const avatarDiv = document.createElement('div');
    avatarDiv.className = 'message-avatar';
    avatarDiv.textContent = role === 'user' ? '👤' : '✦';

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';

    const bubbleDiv = document.createElement('div');
    bubbleDiv.className = `message-bubble${isError ? ' error-bubble' : ''}`;

    if (role === 'assistant' && !isError) {
        // Render markdown for AI responses
        bubbleDiv.innerHTML = marked.parse(content);
        // Apply syntax highlighting to code blocks
        bubbleDiv.querySelectorAll('pre code').forEach(block => {
            hljs.highlightElement(block);
        });
    } else {
        bubbleDiv.textContent = content;
    }

    contentDiv.appendChild(bubbleDiv);
    msgDiv.appendChild(avatarDiv);
    msgDiv.appendChild(contentDiv);
    messagesWrapper.appendChild(msgDiv);

    scrollToBottom();
}

function showTypingIndicator() {
    const msgDiv = document.createElement('div');
    msgDiv.className = 'message ai-message typing-message';

    const avatarDiv = document.createElement('div');
    avatarDiv.className = 'message-avatar';
    avatarDiv.textContent = '✦';

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';

    const typingDiv = document.createElement('div');
    typingDiv.className = 'message-bubble';
    typingDiv.innerHTML = `
        <div class="typing-indicator">
            <div class="dot"></div>
            <div class="dot"></div>
            <div class="dot"></div>
        </div>
    `;

    contentDiv.appendChild(typingDiv);
    msgDiv.appendChild(avatarDiv);
    msgDiv.appendChild(contentDiv);
    messagesWrapper.appendChild(msgDiv);

    scrollToBottom();
    return msgDiv;
}

function hideWelcomeScreen() {
    if (welcomeScreen) {
        welcomeScreen.style.display = 'none';
    }
}

function showWelcomeScreen() {
    if (welcomeScreen) {
        welcomeScreen.style.display = 'flex';
    }
}

function scrollToBottom() {
    requestAnimationFrame(() => {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    });
}

// ============================================
// Input Handling
// ============================================
function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
}

function autoResizeTextarea() {
    messageInput.style.height = 'auto';
    messageInput.style.height = Math.min(messageInput.scrollHeight, 150) + 'px';
}

// ============================================
// Mobile Sidebar
// ============================================
function toggleSidebar() {
    sidebar.classList.toggle('open');

    // Create or toggle overlay
    let overlay = document.querySelector('.sidebar-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'sidebar-overlay';
        document.body.appendChild(overlay);
        overlay.addEventListener('click', () => {
            sidebar.classList.remove('open');
            overlay.classList.remove('active');
        });
    }
    overlay.classList.toggle('active');
}
