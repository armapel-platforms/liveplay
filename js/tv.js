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

    // Initialize Firebase
    firebase.initializeApp(firebaseConfig);
    const database = firebase.database();

    // DOM Elements
    const introScreen = document.getElementById('intro-screen');
    const pairingScreen = document.getElementById('pairing-screen');
    const tvApp = document.getElementById('tv-app');
    const tvCodeContainer = document.getElementById('tv-code-container');
    const playerElement = document.getElementById('player');
    const channelInfoContainer = document.getElementById('channel-info');
    const channelListContainer = document.getElementById('channel-list');
    const channelUl = document.getElementById('channels');

    // App State
    let tvCode = null;
    let channels = [];
    let currentChannelIndex = 0;
    let shakaPlayer;
    let channelInfoTimeout;
    
    function init() {
        enterFullScreen();
        setupClock();
        
        setTimeout(() => {
            introScreen.classList.add('hidden');
            pairingScreen.classList.remove('hidden');
            generateAndRegisterTvCode();
        }, 5000); 
    }

    function generateAndRegisterTvCode() {
        tvCode = Math.floor(1000 + Math.random() * 9000).toString();
        tvCodeContainer.textContent = tvCode;
        
        // Create the TV's record in Firebase so the remote can find it
        const tvRef = database.ref(`tvs/${tvCode}`);
        tvRef.set({
            remoteConnected: false,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        }).then(() => {
            listenForRemoteConnection();
        });
    }

    function listenForRemoteConnection() {
        const remoteStatusRef = database.ref(`tvs/${tvCode}/remoteConnected`);
        remoteStatusRef.on('value', (snapshot) => {
            if (snapshot.val() === true) {
                remoteStatusRef.off(); 
                startTvApplication();
                listenForCommands();
            }
        });
    }

    async function startTvApplication() {
        pairingScreen.classList.add('hidden');
        tvApp.classList.remove('hidden');

        await installShakaPolyfills();
        initShakaPlayer();
        await loadChannels();
        if(channels.length > 0) {
            playChannel(currentChannelIndex);
        } else {
            console.error("No channels loaded, cannot start playback.");
        }
    }
    
    async function loadChannels() {
        try {
            const response = await fetch('/api/getChannels');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            channels = await response.json();
            renderChannelList();
        } catch (error) {
            console.error("Failed to load channels:", error);
        }
    }
    
    async function playChannel(index) {
        if (!channels[index]) return;
        
        currentChannelIndex = index;
        const channel = channels[index];

        try {
            const response = await fetch(`/api/getStream?name=${encodeURIComponent(channel.name)}`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const streamData = await response.json();

            if (streamData.error) {
                console.error("Error fetching stream:", streamData.error);
                return;
            }
            
            const playerConfig = { drm: { clearKeys: streamData.clearKey || {} } };
            await shakaPlayer.load(streamData.manifestUri, null, playerConfig);
            updateChannelUI(channel);
            updateActiveChannelInList();

        } catch (error) {
            console.error('Shaka Player Error:', error);
        }
    }
    
    function renderChannelList() {
        channelUl.innerHTML = '';
        channels.forEach((channel, index) => {
            const li = document.createElement('li');
            li.dataset.index = index;
            // FIXED: Use Material Symbol span instead of img
            li.innerHTML = `<span>${channel.name}</span> <span class="material-symbols-outlined">sensors</span>`;
            li.addEventListener('click', () => playChannel(index));
            channelUl.appendChild(li);
        });
    }
    
    function updateActiveChannelInList() {
        document.querySelectorAll('#channels li').forEach(item => item.classList.remove('active'));
        const activeItem = document.querySelector(`#channels li[data-index="${currentChannelIndex}"]`);
        if(activeItem) {
            activeItem.classList.add('active');
            activeItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }
    
    function listenForCommands() {
        const commandRef = database.ref(`tvs/${tvCode}/command`);
        let lastTimestamp = 0;

        database.ref(`tvs/${tvCode}/timestamp`).on('value', (snapshot) => {
            const newTimestamp = snapshot.val();
            if (newTimestamp > lastTimestamp) {
                lastTimestamp = newTimestamp;
                commandRef.once('value', (cmdSnapshot) => {
                    handleCommand(cmdSnapshot.val());
                });
            }
        });
    }

    function handleCommand(command) {
        if (!command) return;
        console.log("Received command:", command);
        switch (command) {
            case 'channel_up': changeChannel(1); break;
            case 'channel_down': changeChannel(-1); break;
            case 'play_pause': togglePlayPause(); break;
            case 'toggle_mute': toggleMute(); break; // ADDED
            case 'toggle_list': channelListContainer.classList.toggle('visible'); break;
            case 'ok': console.log("OK command received."); break; // Ready for implementation
            case 'left': console.log("Left command received."); break; // Ready for implementation
            case 'right': console.log("Right command received."); break; // Ready for implementation
        }
    }
    
    function changeChannel(direction) {
        let nextIndex = currentChannelIndex + direction;
        if (nextIndex >= channels.length) nextIndex = 0;
        if (nextIndex < 0) nextIndex = channels.length - 1;
        playChannel(nextIndex);
    }
    
    function togglePlayPause() {
        if (playerElement.paused) playerElement.play();
        else playerElement.pause();
    }

    // ADDED: Mute functionality
    function toggleMute() {
        playerElement.muted = !playerElement.muted;
    }

    function updateChannelUI(channel) {
        document.getElementById('channel-name').textContent = channel.name;
        document.getElementById('channel-category').textContent = channel.category;
        channelInfoContainer.style.opacity = '1';
        
        clearTimeout(channelInfoTimeout);
        channelInfoTimeout = setTimeout(() => { channelInfoContainer.style.opacity = '0'; }, 5000);
    }

    function setupClock() {
        const timeEl = document.getElementById('current-time');
        const timeListEl = document.getElementById('time-list');
        const dateListEl = document.getElementById('date-list');
        function update() {
            const now = new Date();
            const timeString = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
            const dateString = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
            timeEl.textContent = timeString;
            timeListEl.textContent = timeString;
            dateListEl.textContent = dateString;
        }
        update();
        setInterval(update, 1000);
    }

    function enterFullScreen() {
        // Note: Automatic fullscreen can be blocked by browsers if not initiated by a user gesture.
        // This is best-effort for TV-like environments.
        document.documentElement.requestFullscreen().catch(err => {
            console.warn(`Could not enter fullscreen: ${err.message}`);
        });
    }

    function initShakaPlayer() {
        shakaPlayer = new shaka.Player(playerElement);
        const ui = new shaka.ui.Overlay(shakaPlayer, playerElement.parentElement, playerElement);
        ui.getControls().getControlsContainer().style.display = 'none'; // Hide default controls
        shakaPlayer.addEventListener('error', e => console.error("Shaka Player Error", e.detail));
    }

    async function installShakaPolyfills() {
        shaka.polyfill.installAll();
        if (!shaka.Player.isBrowserSupported()) {
            console.error('Shaka Player is not supported by this browser.');
        }
    }

    init();
});
