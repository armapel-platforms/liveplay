document.addEventListener('DOMContentLoaded', () => {
  let roomRef;
  const codeEntryContainer = document.getElementById('code-entry-container');
  const remoteControlContainer = document.getElementById('remote-control-container');
  const connectButton = document.getElementById('connect-btn');
  const codeInput = document.getElementById('code-input');
  const clickableButtons = document.querySelectorAll('.control-area, #btn-ok, .num-btn');
  const tvCodeDisplay = document.getElementById('tv-code-display');

  const muteBtn = document.getElementById('btn-mute');
  const pauseBtn = document.getElementById('btn-pause');
  const muteIcon = muteBtn.querySelector('.material-symbols-outlined');
  const pauseIcon = pauseBtn.querySelector('.material-symbols-outlined');
  
  const dPadAndOkButtons = document.querySelectorAll('.control-area, #btn-ok');

  async function initializeRemote() {
    try {
      const response = await fetch('/api/firebase.js');
      if (!response.ok) { throw new Error('Failed to fetch Firebase config'); }
      const firebaseConfig = await response.json();
      if (!firebaseConfig || !firebaseConfig.apiKey) { throw new Error('Invalid Firebase config received'); }
      
      firebase.initializeApp(firebaseConfig);
      
      connectButton.addEventListener('click', () => handleConnect(firebase.database()));
      
      clickableButtons.forEach(button => {
        button.addEventListener('click', handleRemotePress);
      });

      const handlePressFeedback = (event) => {
        event.preventDefault();
        const key = event.currentTarget.dataset.key;
        if (!key) return;

        let visualElement;
        if (key === 'ok') {
          visualElement = document.getElementById('btn-ok');
        } else {
          visualElement = document.querySelector(`.arrow[data-arrow="${key}"]`);
        }

        if (visualElement) {
            if (event.type === 'mousedown' || event.type === 'touchstart') {
                visualElement.classList.add('active');
            } else {
                visualElement.classList.remove('active');
            }
        }
      };

      dPadAndOkButtons.forEach(button => {
        button.addEventListener('mousedown', handlePressFeedback);
        button.addEventListener('mouseup', handlePressFeedback);
        button.addEventListener('mouseleave', handlePressFeedback);
        button.addEventListener('touchstart', handlePressFeedback, { passive: true });
        button.addEventListener('touchend', handlePressFeedback);
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
      const snapshot = await roomRef.get();
      
      if (!snapshot.exists()) {
        throw new Error('Code is incorrect or the TV is disconnected.');
      }
      
      await roomRef.update({ status: 'remote_connected' });
      
      tvCodeDisplay.textContent = enteredCode;
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
    const commandKey = event.currentTarget.dataset.key;

    if (commandKey === 'mute') {
      muteBtn.classList.toggle('active-state');
      muteIcon.textContent = muteBtn.classList.contains('active-state') ? 'volume_off' : 'volume_up';
    }
    if (commandKey === 'pause') {
      pauseBtn.classList.toggle('active-state');
      pauseIcon.textContent = pauseBtn.classList.contains('active-state') ? 'play_arrow' : 'pause';
    }
    
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
    
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
