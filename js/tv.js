document.addEventListener('DOMContentLoaded', () => {
    // --- PASTE FIREBASE CONFIG HERE ---
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
    
    // --- 1. INITIALIZATION ---
    function init() {
        enterFullScreen();
        setupClock();
        
        // Hide intro and show pairing after animation
        setTimeout(() => {
            introScreen.classList.add('hidden');
            pairingScreen.classList.remove('hidden');
            generateTvCode();
        }, 5000); // Must match CSS animation duration
    }

    // --- 2. PAIRING LOGIC ---
    function generateTvCode() {
        tvCode = Math.floor(1000 + Math.random() * 9000).toString();
        tvCodeContainer.textContent = tvCode;
        listenForRemote();
    }

    function listenForRemote() {
        const tvRef = database.ref(`tvs/${tvCode}`);
        tvRef.on('value', (snapshot) => {
            if (snapshot.exists() && snapshot.val().remoteConnected) {
                // Paired successfully!
                tvRef.off(); // Stop listening for new remotes
                startTvApplication();
                listenForCommands();
            }
        });
    }

    // --- 3. TV APPLICATION START ---
    async function startTvApplication() {
        pairingScreen.classList.add('hidden');
        tvApp.classList.remove('hidden');

        await installShakaPolyfills();
        initShakaPlayer();
        await loadChannels();
        playChannel(currentChannelIndex);
    }
    
    // --- 4. CHANNEL & PLAYER MANAGEMENT ---
    async function loadChannels() {
        try {
            // Assuming the getChannels.js is served from /api/getChannels
            const response = await fetch('/api/getChannels');
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
            // Assuming getStream.js is served from /api/getStream
            const response = await fetch(`/api/getStream?name=${encodeURIComponent(channel.name)}`);
            const streamData = await response.json();

            if (streamData.error) {
                console.error("Error fetching stream:", streamData.error);
                return;
            }
            
            // Configure Widevine/ClearKey if needed
            const playerConfig = {
                drm: {
                    clearKeys: streamData.clearKey ? streamData.clearKey : {}
                }
            };

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
            li.innerHTML = `<span>${channel.name}</span> <img src="/logo/sensors-icon.svg" class="sensors-icon">`;
            li.addEventListener('click', () => playChannel(index)); // For testing with mouse
            channelUl.appendChild(li);
        });
    }
    
    function updateActiveChannelInList() {
        const items = channelUl.querySelectorAll('li');
        items.forEach(item => item.classList.remove('active'));
        const activeItem = channelUl.querySelector(`li[data-index="${currentChannelIndex}"]`);
        if(activeItem) {
            activeItem.classList.add('active');
            activeItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }
    
    // --- 5. COMMANDS FROM REMOTE ---
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
        console.log("Received command:", command);
        switch (command) {
            case 'channel_up':
                changeChannel(1);
                break;
            case 'channel_down':
                changeChannel(-1);
                break;
            case 'play_pause':
                togglePlayPause();
                break;
            case 'toggle_list':
                channelListContainer.classList.toggle('visible');
                break;
            // Add cases for 'ok', 'left', 'right' as needed
        }
    }
    
    function changeChannel(direction) {
        let nextIndex = currentChannelIndex + direction;
        if (nextIndex >= channels.length) {
            nextIndex = 0; // Wrap around to the start
        }
        if (nextIndex < 0) {
            nextIndex = channels.length - 1; // Wrap around to the end
        }
        playChannel(nextIndex);
    }
    
    function togglePlayPause() {
        if (playerElement.paused) {
            playerElement.play();
        } else {
            playerElement.pause();
        }
    }

    // --- 6. UI & UTILITIES ---
    function updateChannelUI(channel) {
        document.getElementById('channel-name').textContent = channel.name;
        document.getElementById('channel-category').textContent = channel.category;

        channelInfoContainer.style.opacity = '1';
        
        clearTimeout(channelInfoTimeout);
        channelInfoTimeout = setTimeout(() => {
            channelInfoContainer.style.opacity = '0';
        }, 5000);
    }

    function setupClock() {
        function update() {
            const now = new Date();
            const timeOpts = { hour: '2-digit', minute: '2-digit', hour12: true };
            const dateOpts = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };

            const timeString = now.toLocaleTimeString('en-US', timeOpts);
            const dateString = now.toLocaleDateString('en-US', dateOpts);

            document.getElementById('current-time').textContent = timeString;
            document.getElementById('time-list').textContent = timeString;
            document.getElementById('date-list').textContent = dateString;
        }
        update();
        setInterval(update, 1000);
    }

    function enterFullScreen() {
        document.documentElement.requestFullscreen().catch(err => {
            console.log(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
        });
    }

    function initShakaPlayer() {
        shakaPlayer = new shaka.Player(playerElement);
        // Hide default controls
        const ui = new shaka.ui.Overlay(shakaPlayer, playerElement.parentElement, playerElement);
        ui.getControls().getControlsContainer().style.display = 'none';
        
        shakaPlayer.addEventListener('error', (e) => console.error("Shaka Player Error", e.detail));
    }

    async function installShakaPolyfills() {
        // Install polyfills for browser compatibility if needed.
        shaka.polyfill.installAll();
        if (shaka.Player.isBrowserSupported()) {
            console.log("Shaka Player is supported!");
        } else {
            console.error('Browser not supported!');
        }
    }

    init();
});
