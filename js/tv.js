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

// --- 2. CHANNEL DATA (FROM YOUR API FILES) ---
// For simplicity, we are including the channel data directly here.
// In a production app, you would fetch this from your own secure server.
const streams = [
    { name: 'Kapamilya Channel', manifestUri: 'https://cdn-ue1-prod.tsv2.amagi.tv/linear/amg01006-abs-cbn-kapcha-dash-abscbnono/index.mpd', clearKey: { 'bd17afb5dc9648a39be79ee3634dd4b8': '3ecf305d54a7729299b93a3d69c02ea5' }, category: "General" },
    { name: 'GMA', manifestUri: 'https://ott.m3u8.nathcreqtives.com/gma/stream/manifest.m3u8', category: "General" },
    { name: 'ANC', manifestUri: 'https://cdn-ue1-prod.tsv2.amagi.tv/linear/amg01006-abs-cbn-anc-global-dash-abscbnono/index.mpd', clearKey: { '4bbdc78024a54662854b412d01fafa16': '6039ec9b213aca913821677a28bd78ae' }, category: "News" },
    { name: 'Cinema One', manifestUri: 'https://d9rpesrrg1bdi.cloudfront.net/out/v1/93b9db7b231d45f28f64f29b86dc6c65/index.mpd', clearKey: { '58d0e56991194043b8fb82feb4db7276': 'd68f41b59649676788889e19fb10d22c' }, category: "Movies" },
    { name: 'NBA TV Philippines', manifestUri: 'https://qp-pldt-live-grp-02-prod.akamaized.net/out/u/pl_nba.mpd', clearKey: { 'f36eed9e95f140fabbc88a08abbeafff': '0125600d0eb13359c28bdab4a2ebe75a' }, category: "Sports" },
    { name: 'Cartoon Network', manifestUri: 'https://linearjitp-playback.astro.com.my/dash-wv/linear/509/default_ott.mpd', clearKey: { '1a05bebf706408431a390c3f9f40f410': '89c5ff9f8e65c7fe966afbd2f9128e5f' }, category: "Kids" },
];

// --- 3. APPLICATION LOGIC ---
const firebaseApp = firebase.initializeApp(firebaseConfig);
const database = firebase.getDatabase(firebaseApp);

let pairingCode, roomRef, player, uiTimeout;
let channelList = streams; // Use the data from above
let currentChannelIndex = 0;
let isSidebarActive = false;
let currentFocusIndex = 0;

// DOM Elements
const remoteCodePopup = document.getElementById('remote-code-popup');
const remoteCodeDisplay = document.getElementById('remote-code-display');
const video = document.getElementById('video');
const uiOverlay = document.getElementById('ui-overlay');
const channelName = document.getElementById('channel-name');
const channelCategory = document.getElementById('channel-category');
const sidebar = document.getElementById('sidebar');
const channelListContainer = document.getElementById('channel-list-container');
const timeDateElement = document.getElementById('time-date');

/** Main initialization function */
async function init() {
    try {
        pairingCode = Math.floor(1000 + Math.random() * 9000);
        roomRef = firebase.ref(database, 'rooms/' + pairingCode);
        await firebase.set(roomRef, { createdAt: firebase.serverTimestamp(), status: 'waiting' });
        firebase.onDisconnect(roomRef).remove(); // Auto-cleanup
        remoteCodeDisplay.textContent = pairingCode;
        listenForRemote();
    } catch (error) {
        console.error("Pairing Error:", error);
        remoteCodeDisplay.textContent = "ERR!";
    }
}

/** Listens for changes in our Firebase room */
function listenForRemote() {
    firebase.onValue(roomRef, (snapshot) => {
        const data = snapshot.val();
        if (!data) return;
        if (data.status === 'remote_connected' && !player) {
            remoteCodePopup.classList.add('hidden');
            startPlayer();
        }
        if (data.command) handleRemoteCommand(data.command.key);
    });
}

/** Handles incoming commands from the remote */
function handleRemoteCommand(key) {
    console.log(`Command: ${key}`);
    switch (key) {
        case 'up': isSidebarActive ? moveFocus(-1) : changeChannel(1); break;
        case 'down': isSidebarActive ? moveFocus(1) : changeChannel(-1); break;
        case 'left': isSidebarActive ? hideSidebar() : toggleSidebar(); break;
        case 'right': isSidebarActive ? selectChannelFromList() : null; break;
        case 'ok': isSidebarActive ? selectChannelFromList() : showAndHideUi(); break;
    }
}

/** Initializes Shaka Player and loads the first channel */
async function startPlayer() {
    shaka.polyfill.installAll();
    player = new shaka.Player(video);
    player.addEventListener('error', (e) => console.error('Shaka Player Error:', e.detail));
    populateChannelList();
    updateTimeDate();
    setInterval(updateTimeDate, 30000);
    await loadChannel(channelList[currentChannelIndex]);
}

/** Loads a specified channel into the player */
async function loadChannel(channel) {
    if (!channel) return;
    updateChannelInfo(channel);
    try {
        if (channel.clearKey) {
            player.configure('drm.clearKeys', channel.clearKey);
        }
        await player.load(channel.manifestUri);
        showAndHideUi();
    } catch (error) {
        console.error(`Error loading ${channel.name}:`, error);
    }
}

function changeChannel(direction) {
    currentChannelIndex = (currentChannelIndex - direction + channelList.length) % channelList.length;
    loadChannel(channelList[currentChannelIndex]);
}

function updateChannelInfo(channel) {
    channelName.textContent = channel.name;
    channelCategory.textContent = channel.category;
}

function showAndHideUi() {
    uiOverlay.classList.add('visible');
    clearTimeout(uiTimeout);
    uiTimeout = setTimeout(() => uiOverlay.classList.remove('visible'), 4000);
}

function toggleSidebar() { isSidebarActive ? hideSidebar() : showSidebar(); }

function showSidebar() {
    isSidebarActive = true;
    currentFocusIndex = currentChannelIndex;
    sidebar.classList.add('show');
    updateFocus();
}

function hideSidebar() {
    isSidebarActive = false;
    sidebar.classList.remove('show');
}

function populateChannelList() {
    channelListContainer.innerHTML = '';
    channelList.forEach((channel, index) => {
        const li = document.createElement('li');
        li.dataset.index = index;
        li.textContent = channel.name;
        channelListContainer.appendChild(li);
    });
}

function moveFocus(direction) {
    currentFocusIndex = (currentFocusIndex + direction + channelList.length) % channelList.length;
    updateFocus();
}

function updateFocus() {
    const items = channelListContainer.getElementsByTagName('li');
    Array.from(items).forEach(item => item.classList.remove('focused'));
    const focusedElement = items[currentFocusIndex];
    if (focusedElement) {
        focusedElement.classList.add('focused');
        focusedElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

function selectChannelFromList() {
    if (currentChannelIndex !== currentFocusIndex) {
        currentChannelIndex = currentFocusIndex;
        loadChannel(channelList[currentChannelIndex]);
    }
    hideSidebar();
}

function updateTimeDate() {
    const now = new Date();
    timeDateElement.textContent = now.toLocaleTimeString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

document.addEventListener('DOMContentLoaded', init);
