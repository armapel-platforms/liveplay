// --- DIAGNOSTIC TV SCRIPT ---

// Alert #1: Confirms the script file is running.
alert("tv.js script has started!");

const firebaseConfig = {
  apiKey: "AIzaSyCU_G7QYIBVtb2kdEsQY6SF9skTuka-nfk",
  authDomain: "liveplay-remote-project.firebaseapp.com",
  databaseURL: "https://liveplay-remote-project-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "liveplay-remote-project",
  storageBucket: "liveplay-remote-project.appspot.com",
  messagingSenderId: "135496487558",
  appId: "1:135496487558:web:c2aad6f56157d245917707",
  measurementId: "G-G9JXGMV4B8"
};

// Alert #2: Confirms the config object was created.
alert("Firebase config object is ready.");

try {
    // Alert #3: Confirms we are about to try connecting to Firebase.
    alert("Attempting to initialize Firebase...");

    const firebaseApp = firebase.initializeApp(firebaseConfig);
    const database = firebase.getDatabase(firebaseApp);

    // Alert #4: If you see this, the connection to Firebase was SUCCESSFUL!
    alert("SUCCESS! Firebase was initialized correctly.");

    const remoteCodeDisplay = document.getElementById('remote-code-display');
    const pairingCode = Math.floor(1000 + Math.random() * 9000);
    const roomRef = firebase.ref(database, 'rooms/' + pairingCode);

    firebase.set(roomRef, { status: 'waiting' });
    
    // Alert #5: If you see this, the code was generated and is about to be displayed.
    alert("Pairing code generated. Displaying now.");
    
    remoteCodeDisplay.textContent = pairingCode;

} catch (error) {
    // If ANY of the above steps fail, this alert will show the error.
    alert("AN ERROR OCCURRED: " + error.message);
    console.error("Critical Error:", error);
}
