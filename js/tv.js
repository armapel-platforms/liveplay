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

const firebaseApp = firebase.initializeApp(firebaseConfig);
const database = firebase.getDatabase(firebaseApp);

let pairingCode, roomRef, player, uiTimeout;
let channelList = [];
let currentChannelIndex = 0;
let isSidebarActive = false;
let currentFocusIndex = 0;

const remoteCodePopup = document.getElementById('remote-code-popup');
const remoteCodeDisplay = document.getElementById('remote-code-display');
const video = document.getElementById('video');
const uiOverlay = document.getElementById('ui-overlay');
const channelName = document.getElementById('channel-name');
const channelCategory = document.getElementById('channel-category');
const sidebar = document.getElementById('sidebar');
const channelListContainer = document.getElementById('channel-list-container');
const timeDateElement = document.getElementById('time-date');

async function init() {
    try {
        pairingCode = Math.floor(1000 + Math.random() * 9000);
        roomRef = firebase.ref(database, 'rooms/' + pairingCode);
        await firebase.set(roomRef, { createdAt: firebase.serverTimestamp(), status: 'waiting' });
        firebase.onDisconnect(roomRef).remove();
        remoteCodeDisplay.textContent = pairingCode;
        listenForRemote();
    } catch (error) {
        console.error("Firebase Init Error:", error);
        remoteCodeDisplay.textContent = "ERR!";
    }
}

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

function handleRemoteCommand(key) {
    if (!player) return;
    console.log(`Command: ${key}`);
    switch (key) {
        case 'up': isSidebarActive ? moveFocus(-1) : changeChannel(1); break;
        case 'down': isSidebarActive ? moveFocus(1) : changeChannel(-1); break;
        case 'left': isSidebarActive ? hideSidebar() : toggleSidebar(); break;
        case 'right': isSidebarActive ? selectChannelFromList() : null; break;
        case 'ok': isSidebarActive ? selectChannelFromList() : showAndHideUi(); break;
    }
}

async function startPlayer() {
    try {
        const response = await fetch('/api/getChannels.js');
        if (!response.ok) throw new Error('Failed to fetch channel list from API.');
        channelList = await response.json();
        if (channelList.length === 0) throw new Error('API returned an empty channel list.');
        
        shaka.polyfill.installAll();
        player = new shaka.Player(video);
        player.addEventListener('error', (e) => console.error('Shaka Player Error:', e.detail));
        
        populateChannelList();
        updateTimeDate();
        setInterval(updateTimeDate, 30000);
        
        await loadChannel(channelList[currentChannelIndex]);
        
    } catch (error) {
        console.error("Player failed to start:", error);
        channelName.textContent = "Error";
        channelCategory.textContent = "Could not load channels.";
    }
}

async function loadChannel(channel) {
    if (!channel) return;
    updateChannelInfo(channel);
    try {
        const streamResponse = await fetch(`/api/getStream.js?name=${encodeURIComponent(channel.name)}`);
        if (!streamResponse.ok) throw new Error(`Stream data for ${channel.name} not found.`);
        const streamData = await streamResponse.json();

        if (player.getMediaElement()) await player.unload();
        
        if (streamData.clearKey) {
            player.configure('drm.clearKeys', streamData.clearKey);
        } else {
            player.configure('drm.clearKeys', {});
        }
        
        await player.load(streamData.manifestUri);
        showAndHideUi();
        
    } catch (error) {
        console.error(`Error loading ${channel.name}:`, error);
        channelName.textContent = `Error: ${channel.name}`;
        channelCategory.textContent = "Could not retrieve stream.";
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
