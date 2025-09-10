async function main() {
    const modalTitle = document.getElementById('modal-title');
    const modalLoader = document.getElementById('modal-loader');
    
    try {
        modalTitle.classList.add('hidden');
        modalLoader.classList.remove('hidden');

        const response = await fetch('/api/getFirebase-Config.js');
        if (!response.ok) throw new Error(`Config request failed: ${response.status}`);
        const firebaseConfig = await response.json();

        firebase.initializeApp(firebaseConfig);
        const database = firebase.database();
        
        modalLoader.classList.add('hidden');
        modalTitle.classList.remove('hidden');

        runRemoteApp(database);
    } catch (error) {
        console.error('CRITICAL: Failed to initialize Firebase.', error);
        modalLoader.textContent = 'Error: Could not connect.';
    }
}

function runRemoteApp(database) {
    const COMMANDS = {
        CHANNEL_UP: 'channel_up',
        CHANNEL_DOWN: 'channel_down',
        PLAY_PAUSE: 'play_pause',
        TOGGLE_MUTE: 'toggle_mute',
        TOGGLE_LIST: 'toggle_list',
        OK: 'ok',
        LEFT: 'left',
        RIGHT: 'right',
    };

    const codeModal = document.getElementById('code-modal');
    const remoteApp = document.getElementById('remote-app');
    const codeInput = document.getElementById('code-input');
    const connectBtn = document.getElementById('connect-btn');
    const errorMsg = document.getElementById('error-message');
    const muteBtn = document.getElementById('mute-btn');
    const playPauseBtn = document.getElementById('play-pause-btn');

    let tvRef = null;
    let scrollInterval = null;
    let isMuted = false;
    let isPaused = false;
    

    function connectHandler() {
        const code = codeInput.value;
        if (code.length === 4) {
            validateCode(code);
        } else {
            showError("Code must be 4 digits.");
        }
    }

    function validateCode(code) {
        connectBtn.disabled = true;
        connectBtn.textContent = "Connecting...";
        errorMsg.classList.add('hidden');

        const potentialTvRef = database.ref(`tvs/${code}`);
        potentialTvRef.once('value', (snapshot) => {
            if (snapshot.exists()) {
                tvRef = potentialTvRef;
                tvRef.update({ remoteConnected: true });
                showRemote();
            } else {
                showError("Invalid TV Code. Please check and try again.");
                connectBtn.disabled = false;
                connectBtn.textContent = "Connect";
            }
        });
    }

    function sendCommand(command) {
        if (!tvRef) return;
        tvRef.update({
            command: command,
            timestamp: firebase.database.ServerValue.TIMESTAMP
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

    function setupHoldListeners(button, command) {
        const startEvents = ['mousedown', 'touchstart'];
        const endEvents = ['mouseup', 'mouseleave', 'touchend'];

        startEvents.forEach(evt => button.addEventListener(evt, e => {
            e.preventDefault();
            sendCommand(command);
            scrollInterval = setInterval(() => sendCommand(command), 150);
        }));

        endEvents.forEach(evt => button.addEventListener(evt, () => clearInterval(scrollInterval)));
    }

    connectBtn.addEventListener('click', connectHandler);
    codeInput.addEventListener('keyup', (e) => { if (e.key === 'Enter') connectHandler(); });

    document.getElementById('list-btn').addEventListener('click', () => sendCommand(COMMANDS.TOGGLE_LIST));
    
    playPauseBtn.addEventListener('click', () => {
        sendCommand(COMMANDS.PLAY_PAUSE);
        isPaused = !isPaused;
        playPauseBtn.querySelector('.material-symbols-outlined').textContent = isPaused ? 'play_arrow' : 'pause';
    });
    
    muteBtn.addEventListener('click', () => {
       sendCommand(COMMANDS.TOGGLE_MUTE);
       isMuted = !isMuted;
       muteBtn.querySelector('.material-symbols-outlined').textContent = isMuted ? 'volume_off' : 'volume_up';
    });
    
    setupHoldListeners(document.getElementById('up-btn'), COMMANDS.CHANNEL_UP);
    setupHoldListeners(document.getElementById('down-btn'), COMMANDS.CHANNEL_DOWN);
    document.getElementById('ok-btn').addEventListener('click', () => sendCommand(COMMANDS.OK));
    document.getElementById('left-btn').addEventListener('click', () => sendCommand(COMMANDS.LEFT));
    document.getElementById('right-btn').addEventListener('click', () => sendCommand(COMMANDS.RIGHT));
}

document.addEventListener('DOMContentLoaded', main);
