const firebaseConfig = {
  apiKey: "AIzaSyCU_G7QYIBVtb2kdEsQY6SF9skTuka-nfk",
  authDomain: "liveplay-remote-project.firebaseapp.com",
  databaseURL: "https://liveplay-remote-project-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "liveplay-remote-project",
  storageBucket: "liveplay-remote-project.firebasestorage.app",
  messagingSenderId: "135496487558",
  appId: "1:135496487558:web:c2aad6f56157d245917707",
  measurementId: "G-G9JXGMV4B8"
};
// --- 2. APPLICATION LOGIC ---
const firebaseApp = firebase.initializeApp(firebaseConfig);
const database = firebase.getDatabase(firebaseApp);
let roomRef;

// DOM Elements
const codeEntryContainer = document.getElementById('code-entry-container');
const remoteControlContainer = document.getElementById('remote-control-container');
const connectButton = document.getElementById('connect-btn');
const codeInput = document.getElementById('code-input');
const remoteButtons = document.querySelectorAll('.remote-btn');

/** Handles the click on the "Connect" button */
const handleConnect = async () => {
    const enteredCode = codeInput.value;
    if (!/^\d{4}$/.test(enteredCode)) return alert('Please enter a valid 4-digit code.');
    
    connectButton.disabled = true;
    connectButton.textContent = 'Connecting...';

    try {
        roomRef = firebase.ref(database, 'rooms/' + enteredCode);
        const snapshot = await firebase.get(roomRef);
        if (!snapshot.exists()) throw new Error('Code is incorrect or the TV is disconnected.');
        
        await firebase.update(roomRef, { status: 'remote_connected' });
        
        codeEntryContainer.classList.add('hidden');
        remoteControlContainer.classList.remove('hidden');

    } catch (err) {
        alert(`Pairing Failed: ${err.message}`);
    } finally {
        connectButton.disabled = false;
        connectButton.textContent = 'Connect';
    }
};

/** Handles clicks on any of the remote control buttons */
const handleRemotePress = async (event) => {
    if (!roomRef) return;
    const commandKey = event.currentTarget.id.replace('btn-', '');
    const commandData = {
        key: commandKey,
        timestamp: firebase.serverTimestamp()
    };
    await firebase.update(roomRef, { command: commandData });
    if (navigator.vibrate) navigator.vibrate(50);
};

// Attach Event Listeners
connectButton.addEventListener('click', handleConnect);
remoteButtons.forEach(button => button.addEventListener('click', handleRemotePress);
