document.addEventListener('DOMContentLoaded', () => {
    // --- IMPORTANT: PASTE YOUR FIREBASE CONFIGURATION HERE ---
    const firebaseConfig = {
        apiKey: "YOUR_API_KEY",
        authDomain: "YOUR_AUTH_DOMAIN",
        databaseURL: "YOUR_DATABASE_URL",
        projectId: "YOUR_PROJECT_ID",
        storageBucket: "YOUR_STORAGE_BUCKET",
        messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
        appId: "YOUR_APP_ID"
    };

    firebase.initializeApp(firebaseConfig);
    const database = firebase.database();

    // DOM Elements
    const codeModal = document.getElementById('code-modal');
    const remoteApp = document.getElementById('remote-app');
    const codeInput = document.getElementById('code-input');
    const connectBtn = document.getElementById('connect-btn');
    const errorMsg = document.getElementById('error-message');
    const muteBtn = document.getElementById('mute-btn');
    const playPauseBtn = document.getElementById('play-pause-btn');

    // App State
    let tvCode = null;
    let tvRef = null;
    let scrollInterval = null;
    let isMuted = false;
    let isPaused = false;

    // --- 1. PAIRING ---
    connectBtn.addEventListener('click', () => {
        const code = codeInput.value;
        if (code.length === 4) {
            validateCode(code);
        } else {
            showError("Code must be 4 digits.");
        }
    });
    
    codeInput.addEventListener('keyup', (e) => {
       if (e.key === 'Enter') connectBtn.click();
    });

    // FIXED: Correctly validates the TV code before connecting.
    function validateCode(code) {
        connectBtn.disabled = true;
        const potentialTvRef = database.ref(`tvs/${code}`);
        
        potentialTvRef.once('value', (snapshot) => {
            // Check if the TV code exists in the database.
            if (snapshot.exists()) {
                tvCode = code;
                tvRef = potentialTvRef;
                // Notify the TV that a remote has connected.
                tvRef.update({ remoteConnected: true });
                showRemote();
            } else {
                showError("Invalid TV Code. Please check the code and try again.");
            }
            connectBtn.disabled = false;
        });
    }
    
    function showRemote() {
        codeModal.classList.add('hidden');
        remoteApp.classList.remove('hidden');
    }
    
    function showError(message) {
        errorMsg.textContent = message;
        errorMsg.classList.remove('hidden');
    }

    // --- 2. SENDING COMMANDS ---
    function sendCommand(command) {
        if (!tvRef) return;
        tvRef.update({
            command: command,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        });
    }

    // --- 3. EVENT LISTENERS FOR BUTTONS ---
    document.getElementById('list-btn').addEventListener('click', () => sendCommand('toggle_list'));

    playPauseBtn.addEventListener('click', () => {
        sendCommand('play_pause');
        isPaused = !isPaused;
        playPauseBtn.querySelector('.material-symbols-outlined').textContent = isPaused ? 'play_arrow' : 'pause';
    });
    
    muteBtn.addEventListener('click', () => {
       sendCommand('toggle_mute');
       isMuted = !isMuted;
       muteBtn.querySelector('.material-symbols-outlined').textContent = isMuted ? 'volume_off' : 'volume_up';
    });
    
    // D-Pad Event Listeners with press-and-hold for fast scrolling
    function handleHold(button, command) {
        const startEvents = ['mousedown', 'touchstart'];
        const endEvents = ['mouseup', 'mouseleave', 'touchend'];

        startEvents.forEach(evt => button.addEventListener(evt, e => {
            e.preventDefault();
            sendCommand(command); // Send command immediately on press
            scrollInterval = setInterval(() => {
                sendCommand(command); // Continue sending while held
            }, 150);
        }));

        endEvents.forEach(evt => button.addEventListener(evt, () => {
            clearInterval(scrollInterval);
        }));
    }
    
    handleHold(document.getElementById('up-btn'), 'channel_up');
    handleHold(document.getElementById('down-btn'), 'channel_down');

    document.getElementById('ok-btn').addEventListener('click', () => sendCommand('ok'));
    document.getElementById('left-btn').addEventListener('click', () => sendCommand('left'));
    document.getElementById('right-btn').addEventListener('click', () => sendCommand('right'));
});
