document.addEventListener('DOMContentLoaded', () => {
    let roomRef;
    const codeEntryContainer = document.getElementById('code-entry-container');
    const remoteControlContainer = document.getElementById('remote-control-container');
    const connectButton = document.getElementById('connect-btn');
    const codeInput = document.getElementById('code-input');
    const clickableButtons = document.querySelectorAll('.remote-btn, .control-area, #btn-ok');
    const muteBtn = document.getElementById('btn-mute');
    const playPauseBtn = document.getElementById('btn-playpause');
    const muteIcon = muteBtn.querySelector('.material-symbols-outlined');
    const playPauseIcon = playPauseBtn.querySelector('.material-symbols-outlined');

    async function initializeRemote() {
        try {
            const response = await fetch('/api/firebase.js');
            if (!response.ok) {
                throw new Error('Failed to fetch Firebase config');
            }
            const firebaseConfig = await response.json();
            
            if (!firebaseConfig || !firebaseConfig.apiKey) {
                throw new Error('Invalid Firebase config received');
            }
            
            firebase.initializeApp(firebaseConfig);
            
            connectButton.addEventListener('click', () => handleConnect(firebase.database()));
            clickableButtons.forEach(button => {
                button.addEventListener('click', handleRemotePress);
            });

        } catch (error) {
            console.error("Initialization failed:", error);
            alert("Could not connect to the server. Please refresh the page.");
        }
    }

    const handleConnect = async (database) => {
        const enteredCode = codeInput.value;
        if (!/^\d{4}$/.test(enteredCode)) {
            alert('Please enter a valid 4-digit code.');
            return;
        }
        
        connectButton.disabled = true;
        connectButton.textContent = 'Connecting...';

        try {
            roomRef = database.ref('rooms/' + enteredCode);
            const snapshot = await roomRef.get(); // .get() is cleaner for reading once

            if (!snapshot.exists()) {
                throw new Error('Code is incorrect or the TV is disconnected.');
            }
            
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
        const commandKey = event.currentTarget.id.replace('btn-', '');

        // Handle UI changes immediately
        if (commandKey === 'mute') {
            muteBtn.classList.toggle('active-state');
            muteIcon.textContent = muteBtn.classList.contains('active-state') ? 'volume_off' : 'volume_up';
        }
        if (commandKey === 'playpause') {
            playPauseBtn.classList.toggle('active-state');
            playPauseIcon.textContent = playPauseBtn.classList.contains('active-state') ? 'play_arrow' : 'pause';
        }

        if (navigator.vibrate) {
            navigator.vibrate(50);
        }
        
        // Send command to Firebase only if connected
        if (roomRef) {
            const commandData = {
                key: commandKey,
                timestamp: firebase.database.ServerValue.TIMESTAMP
            };
            await roomRef.child('command').set(commandData);
        }
    };

    initializeRemote();
});
