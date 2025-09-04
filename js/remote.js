let roomRef;
const codeEntryContainer = document.getElementById('code-entry-container');
const remoteControlContainer = document.getElementById('remote-control-container');
const connectButton = document.getElementById('connect-btn');
const codeInput = document.getElementById('code-input');
const remoteButtons = document.querySelectorAll('.remote-btn');
const muteBtn = document.getElementById('btn-mute');
const playPauseBtn = document.getElementById('btn-playpause');

async function initializeRemote() {
    try {
        const response = await fetch('/api/firebase.js');
        if (!response.ok) {
            throw new Error('Failed to fetch Firebase config');
        }
        const firebaseConfig = await response.json();

        firebase.initializeApp(firebaseConfig);
        const database = firebase.database();
      
        connectButton.addEventListener('click', () => handleConnect(database));
        remoteButtons.forEach(button => {
            button.addEventListener('click', handleRemotePress);
        });

    } catch (error) {
        console.error("Initialization failed:", error);
        alert("Could not connect to the server. Please refresh the page.");
    }
}

const handleConnect = async (database) => {
    const enteredCode = codeInput.value;
    if (!/^\d{4}$/.test(enteredCode)) return alert('Please enter a valid 4-digit code.');
    
    connectButton.disabled = true;
    connectButton.textContent = 'Connecting...';

    try {
        roomRef = database.ref('rooms/' + enteredCode);
        const snapshot = await roomRef.get();
        if (!snapshot.exists()) throw new Error('Code is incorrect or the TV is disconnected.');
        
        await roomRef.update({ status: 'remote_connected' });
        
        codeEntryContainer.classList.add('hidden');
        remoteControlContainer.classList.remove('hidden');
    } catch (err) {
        alert(`Pairing Failed: ${err.message}`);
    } finally {
        connectButton.disabled = false;
        connectButton.textContent = 'Connect';
    }
};

const handleRemotePress = async (event) => {
    if (!roomRef) return;
    const commandKey = event.currentTarget.id.replace('btn-', '');

    if (commandKey === 'mute') {
        muteBtn.textContent = muteBtn.textContent === 'volume_up' ? 'volume_off' : 'volume_up';
    }
    if (commandKey === 'playpause') {
        playPauseBtn.textContent = playPauseBtn.textContent === 'pause' ? 'play_arrow' : 'pause';
    }

    const commandData = {
        key: commandKey,
        timestamp: firebase.database.ServerValue.TIMESTAMP
    };
    await roomRef.update({ command: commandData });
    if (navigator.vibrate) navigator.vibrate(50);
};

document.addEventListener('DOMContentLoaded', initializeRemote);
