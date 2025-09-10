async function main() {
    const loadingOverlay = document.getElementById('loading-overlay');
    try {
        const response = await fetch('/api/getFirebase-Config.js');
        if (!response.ok) throw new Error(`Config request failed: ${response.status}`);
        const firebaseConfig = await response.json();

        firebase.initializeApp(firebaseConfig);
        const database = firebase.database();

        loadingOverlay.style.opacity = '0';
        setTimeout(() => loadingOverlay.classList.add('hidden'), 500);

        runTvApp(database);
    } catch (error) {
        console.error('CRITICAL: Failed to initialize Firebase.', error);
        loadingOverlay.innerHTML = `<div class="loading-text">Error: Could not start application.</div>`;
    }
}

function runTvApp(database) {
    const COMMANDS = {
        CHANNEL_UP: 'channel_up',
        CHANNEL_DOWN: 'channel_down',
        PLAY_PAUSE: 'play_pause',
        TOGGLE_MUTE: 'toggle_mute',
        TOGGLE_LIST: 'toggle_list',
    };

    const introScreen = document.getElementById('intro-screen');
    const pairingScreen = document.getElementById('pairing-screen');
    const tvApp = document.getElementById('tv-app');
    const tvCodeContainer = document.getElementById('tv-code-container');
    const playerElement = document.getElementById('player');
    const channelInfoContainer = document.getElementById('channel-info');
    const channelNameEl = document.getElementById('channel-name');
    const channelCategoryEl = document.getElementById('channel-category');
    const channelListContainer = document.getElementById('channel-list');
    const channelUl = document.getElementById('channels');

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
        const tvRef = database.ref(`tvs/${tvCode}`);
        tvRef.set({
            remoteConnected: false,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        }).then(listenForRemoteConnection);
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

    function listenForCommands() {
        let lastTimestamp = 0;
        const timestampRef = database.ref(`tvs/${tvCode}/timestamp`);
        timestampRef.on('value', (snapshot) => {
            const newTimestamp = snapshot.val();
            if (newTimestamp > lastTimestamp) {
                lastTimestamp = newTimestamp;
                const commandRef = database.ref(`tvs/${tvCode}/command`);
                commandRef.once('value', (cmdSnapshot) => handleCommand(cmdSnapshot.val()));
            }
        });
    }

    function handleCommand(command) {
        if (!command) return;
        switch (command) {
            case COMMANDS.CHANNEL_UP:   changeChannel(1); break;
            case COMMANDS.CHANNEL_DOWN: changeChannel(-1); break;
            case COMMANDS.PLAY_PAUSE:   togglePlayPause(); break;
            case COMMANDS.TOGGLE_MUTE:  toggleMute(); break;
            case COMMANDS.TOGGLE_LIST:  channelListContainer.classList.toggle('visible'); break;
        }
    }

    async function startTvApplication() {
        pairingScreen.classList.add('hidden');
        tvApp.classList.remove('hidden');
        await installShakaPolyfills();
        initShakaPlayer();
        await loadChannels();
        if (channels.length > 0) playChannel(currentChannelIndex);
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
            if (streamData.error) throw new Error(streamData.error);
            
            const playerConfig = { drm: { clearKeys: streamData.clearKey || {} } };
            await shakaPlayer.load(streamData.manifestUri, null, playerConfig);
            updateChannelUI(channel);
            updateActiveChannelInList();
        } catch (error) {
            console.error(`Stream Error for "${channel.name}":`, error);
            channelNameEl.textContent = channel.name;
            channelCategoryEl.textContent = "Error playing stream";
            channelInfoContainer.style.opacity = '1';
            clearTimeout(channelInfoTimeout);
        }
    }

    function changeChannel(direction) {
        let nextIndex = currentChannelIndex + direction;
        if (nextIndex >= channels.length) nextIndex = 0;
        if (nextIndex < 0) nextIndex = channels.length - 1;
        playChannel(nextIndex);
    }

    function togglePlayPause() {
        if (playerElement.paused) playerElement.play(); else playerElement.pause();
    }

    function toggleMute() {
        playerElement.muted = !playerElement.muted;
    }

    function renderChannelList() {
        channelUl.innerHTML = '';
        channels.forEach((channel, index) => {
            const li = document.createElement('li');
            li.dataset.index = index;
            li.innerHTML = `<span>${channel.name}</span> <span class="material-symbols-outlined">sensors</span>`;
            li.addEventListener('click', () => playChannel(index));
            channelUl.appendChild(li);
        });
    }

    function updateActiveChannelInList() {
        document.querySelectorAll('#channels li').forEach(item => item.classList.remove('active'));
        const activeItem = document.querySelector(`#channels li[data-index="${currentChannelIndex}"]`);
        if (activeItem) {
            activeItem.classList.add('active');
            activeItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    function updateChannelUI(channel) {
        channelNameEl.textContent = channel.name;
        channelCategoryEl.textContent = channel.category;
        channelInfoContainer.style.opacity = '1';
        clearTimeout(channelInfoTimeout);
        channelInfoTimeout = setTimeout(() => {
            channelInfoContainer.style.opacity = '0';
        }, 5000);
    }

    function setupClock() {
        const timeEl = document.getElementById('current-time');
        const timeListEl = document.getElementById('time-list');
        const dateListEl = document.getElementById('date-list');
        const update = () => {
            const now = new Date();
            const timeString = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
            const dateString = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
            timeEl.textContent = timeString;
            timeListEl.textContent = timeString;
            dateListEl.textContent = dateString;
        };
        update();
        setInterval(update, 1000);
    }

    function enterFullScreen() {
        document.documentElement.requestFullscreen().catch(err => {
            console.warn(`Could not enter fullscreen: ${err.message}`);
        });
    }

    function initShakaPlayer() {
        shakaPlayer = new shaka.Player(playerElement);
        const ui = new shaka.ui.Overlay(shakaPlayer, playerElement.parentElement, playerElement);
        ui.getControls().getControlsContainer().style.display = 'none';
        shakaPlayer.addEventListener('error', e => console.error("Shaka Player Error Details:", e.detail));
    }

    async function installShakaPolyfills() {
        shaka.polyfill.installAll();
        if (!shaka.Player.isBrowserSupported()) {
            console.error('Shaka Player is not supported by this browser.');
        }
    }

    init();
}

document.addEventListener('DOMContentLoaded', main);
