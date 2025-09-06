        document.addEventListener('DOMContentLoaded', () => {
            // --- Global Variables & Element Selectors ---
            let roomRef; // Holds the reference to the Firebase room
            let database; // Holds the Firebase database instance

            // Screen containers
            const codeEntryContainer = document.getElementById('code-entry-container');
            const remoteControlContainer = document.getElementById('remote-control-container');
            
            // Code entry elements
            const connectButton = document.getElementById('connect-btn');
            const codeInput = document.getElementById('code-input');
            
            // Remote display elements
            const tvCodeDisplay = document.getElementById('tv-code-display');
            const deviceNameElement = document.getElementById('device-name');
            
            // All interactive buttons on the remote
            const allRemoteButtons = document.querySelectorAll('.control-area, #btn-ok, .num-btn');
            
            // Buttons with special toggle states
            const muteBtn = document.getElementById('btn-mute');
            const pauseBtn = document.getElementById('btn-pause');

            /**
             * Initializes the remote by fetching Firebase config and setting up listeners.
             */
            async function initializeRemote() {
                try {
                    // Fetch Firebase configuration from your server endpoint
                    const response = await fetch('/api/firebase.js');
                    if (!response.ok) {
                        throw new Error('Failed to fetch Firebase config. Please check the server.');
                    }
                    const firebaseConfig = await response.json();
                    
                    if (!firebaseConfig || !firebaseConfig.apiKey) {
                        throw new Error('Invalid Firebase config received from the server.');
                    }
                    
                    // Initialize Firebase and get a database reference
                    firebase.initializeApp(firebaseConfig);
                    database = firebase.database();
                    
                    // --- Event Listener Setup ---
                    connectButton.addEventListener('click', handleConnect);
                    
                    // Attach visual feedback and command listeners to every button
                    allRemoteButtons.forEach(button => {
                        // For sending the command on click/tap
                        button.addEventListener('click', handleRemotePress);
                        
                        // For visual feedback while pressing
                        button.addEventListener('mousedown', handlePressFeedback);
                        button.addEventListener('mouseup', handlePressFeedback);
                        button.addEventListener('mouseleave', handlePressFeedback);
                        button.addEventListener('touchstart', handlePressFeedback, { passive: true });
                        button.addEventListener('touchend', handlePressFeedback);
                    });

                } catch (error) {
                    console.error("Critical Initialization Error:", error);
                    alert("Could not initialize the remote control. Please refresh the page to try again.");
                }
            }

            /**
             * Handles the connection process when the user clicks "Connect".
             */
            const handleConnect = async () => {
                const enteredCode = codeInput.value.trim();
                if (!/^\d{4}$/.test(enteredCode)) {
                    alert('Please enter a valid 4-digit code.');
                    return;
                }
                
                // Disable button to prevent multiple clicks
                connectButton.disabled = true;
                connectButton.textContent = 'Connecting...';
                
                try {
                    roomRef = database.ref('rooms/' + enteredCode);
                    const snapshot = await roomRef.get();
                    
                    if (!snapshot.exists()) {
                        throw new Error('Code is incorrect or the TV is disconnected.');
                    }
                    
                    // Fetch TV info from Firebase to display its name
                    const roomData = snapshot.val();
                    if (roomData.deviceInfo && roomData.deviceInfo.name) {
                        deviceNameElement.textContent = roomData.deviceInfo.name;
                    } else {
                        deviceNameElement.textContent = 'Connected TV'; // Fallback name
                    }
                    
                    // Update Firebase with connection status
                    await roomRef.update({ status: 'remote_connected' });
                    
                    // Switch to the remote control view
                    tvCodeDisplay.textContent = enteredCode;
                    codeEntryContainer.classList.add('hidden');
                    remoteControlContainer.classList.remove('hidden');
                    
                } catch (err) {
                    alert(`Pairing Failed: ${err.message}`);
                    // Only re-enable the button if the connection fails
                    connectButton.disabled = false;
                    connectButton.textContent = 'Connect';
                }
            };

            /**
             * Handles a press on any remote control button.
             */
            const handleRemotePress = async (event) => {
                const button = event.currentTarget;
                const commandKey = button.dataset.key;

                // Safety check: Do nothing if the button has no data-key
                if (!commandKey) {
                    console.warn('Button pressed without a data-key:', button);
                    return;
                }

                // Handle special UI toggles for Mute and Pause
                if (commandKey === 'mute' && muteBtn) {
                    const muteIcon = muteBtn.querySelector('.material-symbols-outlined');
                    muteBtn.classList.toggle('active-state');
                    // Also toggle the icon's 'fill' state for visual feedback
                    muteIcon.style.fontVariationSettings = muteBtn.classList.contains('active-state') ? "'FILL' 1" : "'FILL' 0";
                    muteIcon.textContent = muteBtn.classList.contains('active-state') ? 'volume_off' : 'volume_up';
                }
                if (commandKey === 'pause' && pauseBtn) {
                    const pauseIcon = pauseBtn.querySelector('.material-symbols-outlined');
                    pauseBtn.classList.toggle('active-state');
                    // Also toggle the icon's 'fill' state for visual feedback
                    pauseIcon.style.fontVariationSettings = pauseBtn.classList.contains('active-state') ? "'FILL' 1" : "'FILL' 0";
                    pauseIcon.textContent = pauseBtn.classList.contains('active-state') ? 'play_arrow' : 'pause';
                }
                
                // Provide haptic feedback if the browser supports it
                if (navigator.vibrate) {
                    navigator.vibrate(50);
                }
                
                // Send the command to Firebase if the connection is active
                if (roomRef) {
                    try {
                        const commandData = {
                            key: commandKey,
                            timestamp: firebase.database.ServerValue.TIMESTAMP
                        };
                        await roomRef.child('command').set(commandData);
                    } catch (error) {
                        console.error("Failed to send command to Firebase:", error);
                        // Optional: alert the user if commands are failing
                        // alert("Command could not be sent. Please check your internet connection.");
                    }
                }
            };

            /**
             * Provides visual feedback for button presses by adding/removing an 'active' class.
             */
            const handlePressFeedback = (event) => {
                const button = event.currentTarget;
                if (event.type === 'mousedown' || event.type === 'touchstart') {
                    button.classList.add('active');
                } else {
                    // Removes class on mouseup, mouseleave, touchend
                    button.classList.remove('active');
                }
            };
            
            // --- Start the Application ---
            initializeRemote();
        });
