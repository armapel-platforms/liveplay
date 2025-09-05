let pairingCode, roomRef, player, uiTimeout;
let channelList = [];
let currentChannelIndex = 0, isSidebarActive = false, currentFocusIndex = 0, isExitPopupActive = false;
let lastCommandTime = 0;
let database;
let channelInput = '';
let channelInputTimeout;

const remoteCodePopup = document.getElementById('remote-code-popup');
const remoteCodeDisplay = document.getElementById('remote-code-display');
const video = document.getElementById('video');
const uiOverlay = document.getElementById('ui-overlay');
const channelName = document.getElementById('channel-name');
const channelNumber = document.getElementById('channel-number');
const channelCategory = document.getElementById('channel-category');
const sidebar = document.getElementById('sidebar');
const channelListContainer = document.getElementById('channel-list-container');
const timeDateElement = document.getElementById('time-date');
const exitPopupOverlay = document.getElementById('exit-popup-overlay');
const exitConfirmBtn = document.getElementById('exit-confirm-btn');
const exitCancelBtn = document.getElementById('exit-cancel-btn');
const directInputDisplay = document.getElementById('direct-input-display');
const directInputChannelNumber = document.getElementById('direct-input-channel-number');
const directInputChannelName = document.getElementById('direct-input-channel-name');


async function initializeApp() {
    try {
        const response = await fetch('/api/firebase.js');
        if (!response.ok) {
            throw new Error('Failed to fetch Firebase config');
        }
        const firebaseConfig = await response.json();

        firebase.initializeApp(firebaseConfig);
        database = firebase.database();
        
        initFirebase();

    } catch (error) {
        console.error("Initialization failed:", error);
        remoteCodeDisplay.textContent = "ERR!";
    }
}

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
        if (data.command && data.command.timestamp > lastCommandTime) {
            handleRemoteCommand(data.command);
        }
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

function handleRemoteCommand(command) {
    if (!player) return;

    const key = command.key;
    const now = command.timestamp;
    const timeSinceLast = now - lastCommandTime;
    lastCommandTime = now;

    if (!isNaN(parseInt(key))) {
        handleChannelInput(key);
        return;
    } else {
        hideDirectInput();
    }

    if (isExitPopupActive) {
        if (key === 'left') exitCancelBtn.focus();
        else if (key === 'right') exitConfirmBtn.focus();
        else if (key === 'ok') document.activeElement.click();
        else if (key === 'back') hideExitPopup();
        return;
    }

    if (isSidebarActive) {
        let moveStep = 1;
        if ((key === 'up' || key === 'down') && timeSinceLast < 400) {
            moveStep = 5;
        }
        switch (key) {
            case 'left': hideSidebar(); break;
            case 'up': moveFocus(-moveStep); break;
            case 'down': moveFocus(moveStep); break;
            case 'ok': selectChannelFromList(); break;
            case 'back': hideSidebar(); break;
        }
        return;
    }

    switch (key) {
        case 'up': changeChannel(1); break;
        case 'down': changeChannel(-1); break;
        case 'left': showSidebar(); break;
        case 'ok': showAndHideUi(); break;
        case 'back': showExitPopup(); break;
        case 'mute': video.muted = !video.muted; break;
        case 'pause': video.paused ? video.play() : video.pause(); break;
    }
}

function handleChannelInput(number) {
    clearTimeout(channelInputTimeout);
    channelInput += number;

    directInputDisplay.classList.add('visible');
    
    const channelIndex = parseInt(channelInput, 10) - 1;
    if (channelList[channelIndex]) {
        directInputChannelName.textContent = channelList[channelIndex].name;
    } else {
        directInputChannelName.textContent = '...';
    }
    directInputChannelNumber.textContent = channelInput.padStart(3, '0');

    if (channelInput.length >= 3) {
        tuneToChannelInput();
    } else {
        channelInputTimeout = setTimeout(tuneToChannelInput, 2000);
    }
}

function tuneToChannelInput() {
    const channelIndex = parseInt(channelInput, 10) - 1;
    if (channelIndex >= 0 && channelIndex < channelList.length) {
        currentChannelIndex = channelIndex;
        loadChannel(channelList[currentChannelIndex]);
    }
    channelInput = '';
    setTimeout(() => directInputDisplay.classList.remove('visible'), 500);
}

function hideDirectInput() {
    channelInput = '';
    clearTimeout(channelInputTimeout);
    directInputDisplay.classList.remove('visible');
}

async function loadChannel(channel) {
    if (!channel) return;
    updateChannelInfo(channel, currentChannelIndex);
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
function formatChannelNumber(index) { return String(index + 1).padStart(3, '0'); }
function updateChannelInfo(channel, index) { channelName.textContent = channel.name; channelCategory.textContent = channel.category; channelNumber.textContent = formatChannelNumber(index); }
function showAndHideUi() { uiOverlay.classList.add('visible'); clearTimeout(uiTimeout); uiTimeout = setTimeout(() => uiOverlay.classList.remove('visible'), 4000); }
function toggleSidebar() { isSidebarActive ? hideSidebar() : showSidebar(); }
function showSidebar() { isSidebarActive = true; currentFocusIndex = currentChannelIndex; sidebar.classList.add('show'); updateFocus(); }
function hideSidebar() { isSidebarActive = false; sidebar.classList.remove('show'); }
function populateChannelList() { 
    channelListContainer.innerHTML = ''; 
    channelList.forEach((channel, index) => { 
        const li = document.createElement('li'); 
        li.dataset.index = index;
        
        const textWrapper = document.createElement('div');
        textWrapper.className = 'channel-text-wrapper';

        const numberSpan = document.createElement('span');
        numberSpan.className = 'channel-list-number';
        numberSpan.textContent = formatChannelNumber(index);

        const nameSpan = document.createElement('span');
        nameSpan.className = 'channel-list-name';
        nameSpan.textContent = channel.name;
        
        const liveIcon = document.createElement('span');
        liveIcon.className = 'material-symbols-outlined';
        liveIcon.textContent = 'sensors';

        textWrapper.appendChild(numberSpan);
        textWrapper.appendChild(nameSpan);

        li.appendChild(textWrapper);
        li.appendChild(liveIcon);
        channelListContainer.appendChild(li); 
    }); 
}

function moveFocus(direction) { 
    currentFocusIndex = (currentFocusIndex + direction + channelList.length) % channelList.length; 
    if (currentFocusIndex < 0) currentFocusIndex = 0;
    if (currentFocusIndex >= channelList.length) currentFocusIndex = channelList.length -1;
    updateFocus(); 
}
function updateFocus() { const items = channelListContainer.getElementsByTagName('li'); Array.from(items).forEach(item => item.classList.remove('focused')); const focusedElement = items[currentFocusIndex]; if (focusedElement) { focusedElement.classList.add('focused'); focusedElement.scrollIntoView({ behavior: 'smooth', block: 'center' }); } }
function selectChannelFromList() { if (currentChannelIndex !== currentFocusIndex) { currentChannelIndex = currentFocusIndex; loadChannel(channelList[currentChannelIndex]); } hideSidebar(); }
function updateTimeDate() { const now = new Date(); timeDateElement.textContent = now.toLocaleTimeString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); }
function showExitPopup() { isExitPopupActive = true; exitPopupOverlay.classList.add('show'); exitCancelBtn.focus(); }
function hideExitPopup() { isExitPopupActive = false; exitPopupOverlay.classList.remove('show'); }

document.addEventListener('DOMContentLoaded', initializeApp);
