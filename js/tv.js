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

firebase.initializeApp(firebaseConfig);
const database = firebase.database();

let pairingCode, roomRef, player, uiTimeout;
let channelList = [];
let currentChannelIndex = 0, isSidebarActive = false, currentFocusIndex = 0, isExitPopupActive = false;

const remoteCodePopup = document.getElementById('remote-code-popup');
const remoteCodeDisplay = document.getElementById('remote-code-display');
const video = document.getElementById('video');
const uiOverlay = document.getElementById('ui-overlay');
const channelName = document.getElementById('channel-name');
const channelCategory = document.getElementById('channel-category');
const sidebar = document.getElementById('sidebar');
const channelListContainer = document.getElementById('channel-list-container');
const timeDateElement = document.getElementById('time-date');
const exitPopupOverlay = document.getElementById('exit-popup-overlay');
const exitConfirmBtn = document.getElementById('exit-confirm-btn');
const exitCancelBtn = document.getElementById('exit-cancel-btn');

document.addEventListener('DOMContentLoaded', initFirebase);

async function initFirebase() {
    try {
        pairingCode = Math.floor(1000 + Math.random() * 9000);
        roomRef = database.ref('rooms/' + pairingCode);
        await roomRef.set({ createdAt: firebase.database.ServerValue.TIMESTAMP, status: 'waiting' });
        roomRef.onDisconnect().remove();
        remoteCodeDisplay.textContent = pairingCode;
        listenForRemote();
    } catch (error) {
        console.error("Firebase Init Error:", error);
        remoteCodeDisplay.textContent = "ERR!";
    }
}

function listenForRemote() {
    roomRef.on('value', (snapshot) => {
        const data = snapshot.val();
        if (!data) return;
        if (data.status === 'remote_connected' && !player) {
            remoteCodePopup.classList.add('hidden');
            initializePlayerAndUI();
        }
        if (data.command) handleRemoteCommand(data.command.key);
    });
}

async function initializePlayerAndUI() {
    try {
        const response = await fetch('/api/getChannels.js');
        if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
        channelList = await response.json();
        if (channelList.length === 0) throw new Error('API returned empty channel list.');

        shaka.polyfill.installAll();
        player = new shaka.Player(video);
        player.addEventListener('error', (e) => console.error('Shaka Player Error:', e.detail));
        
        populateChannelList();
        updateTimeDate();
        setInterval(updateTimeDate, 30000);
        exitConfirmBtn.addEventListener('click', () => window.close());
        exitCancelBtn.addEventListener('click', hideExitPopup);

        await loadChannel(channelList[currentChannelIndex]);
    } catch (error) {
        console.error("Player Start Error:", error);
    }
}

function handleRemoteCommand(key) {
    if (!player) return;

    if (isExitPopupActive) {
        if (key === 'left') exitCancelBtn.focus();
        else if (key === 'right') exitConfirmBtn.focus();
        else if (key === 'ok') document.activeElement.click();
        else if (key === 'back') hideExitPopup();
        return;
    }

    if (isSidebarActive) {
        switch (key) {
            case 'left': hideSidebar(); break;
            case 'up': moveFocus(-1); break;
            case 'down': moveFocus(1); break;
            case 'ok': selectChannelFromList(); break;
            case 'back': hideSidebar(); break;
        }
        return;
    }

    switch (key) {
        case 'up': changeChannel(1); break;
        case 'down': changeChannel(-1); break;
        case 'left': showSidebar(); break;
        case 'right': showExitPopup(); break;
        case 'ok': showAndHideUi(); break;
        case 'back': showExitPopup(); break;
    }
}

async function loadChannel(channel) {
    if (!channel) return;
    updateChannelInfo(channel);
    try {
        const streamResponse = await fetch(`/api/getStream.js?name=${encodeURIComponent(channel.name)}`);
        if (!streamResponse.ok) throw new Error(`API Error: ${streamResponse.statusText}`);
        const streamData = await streamResponse.json();
        if (player.getMediaElement()) await player.unload();
        player.configure('drm.clearKeys', streamData.clearKey || {});
        await player.load(streamData.manifestUri);
        showAndHideUi();
    } catch (error) {
        console.error(`Error loading ${channel.name}:`, error);
    }
}

function changeChannel(direction) { currentChannelIndex = (currentChannelIndex - direction + channelList.length) % channelList.length; loadChannel(channelList[currentChannelIndex]); }
function updateChannelInfo(channel) { channelName.textContent = channel.name; channelCategory.textContent = channel.category; }
function showAndHideUi() { uiOverlay.classList.add('visible'); clearTimeout(uiTimeout); uiTimeout = setTimeout(() => uiOverlay.classList.remove('visible'), 4000); }
function toggleSidebar() { isSidebarActive ? hideSidebar() : showSidebar(); }
function showSidebar() { isSidebarActive = true; currentFocusIndex = currentChannelIndex; sidebar.classList.add('show'); updateFocus(); }
function hideSidebar() { isSidebarActive = false; sidebar.classList.remove('show'); }
function populateChannelList() { channelListContainer.innerHTML = ''; channelList.forEach((channel, index) => { const li = document.createElement('li'); li.dataset.index = index; li.textContent = channel.name; channelListContainer.appendChild(li); }); }
function moveFocus(direction) { currentFocusIndex = (currentFocusIndex + direction + channelList.length) % channelList.length; updateFocus(); }
function updateFocus() { const items = channelListContainer.getElementsByTagName('li'); Array.from(items).forEach(item => item.classList.remove('focused')); const focusedElement = items[currentFocusIndex]; if (focusedElement) { focusedElement.classList.add('focused'); focusedElement.scrollIntoView({ behavior: 'smooth', block: 'center' }); } }
function selectChannelFromList() { if (currentChannelIndex !== currentFocusIndex) { currentChannelIndex = currentFocusIndex; loadChannel(channelList[currentChannelIndex]); } hideSidebar(); }
function updateTimeDate() { const now = new Date(); timeDateElement.textContent = now.toLocaleTimeString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); }
function showExitPopup() { isExitPopupActive = true; exitPopupOverlay.classList.add('show'); exitCancelBtn.focus(); }
function hideExitPopup() { isExitPopupActive = false; exitPopupOverlay.classList.remove('show'); }
