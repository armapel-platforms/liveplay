// tv.js

let channelList = [];
let currentChannelIndex = 0;
let infoTimeout;
let isExitPopupActive = false;
let isSidebarActive = false;
let currentFocusIndex = 0;

const video = document.getElementById('video');
const clickOverlay = document.getElementById('click-overlay');
const fadeOverlay = document.getElementById('fade-overlay');
const liveplayLogo = document.getElementById('liveplay-logo');
const channelInfo = document.getElementById('channel-info');
const channelName = document.getElementById('channel-name');
const channelCategory = document.getElementById('channel-category');
const liveIndicatorCorner = document.getElementById('live-indicator-corner');
const exitPopupOverlay = document.getElementById('exit-popup-overlay');
const exitConfirmBtn = document.getElementById('exit-confirm-btn');
const exitCancelBtn = document.getElementById('exit-cancel-btn');
const sidebar = document.getElementById('sidebar');
const channelListContainer = document.getElementById('channel-list-container');
const timeDateElement = document.getElementById('time-date');
const remoteCodePopup = document.getElementById('remote-code-popup');
const remoteCodeDisplay = document.getElementById('remote-code-display');
let player;

// In a real application, you would initialize a WebSocket connection here
// const socket = new WebSocket('ws://your-backend-url');
// socket.onmessage = handleRemoteCommand;

async function init() {
    const pairingCode = Math.floor(1000 + Math.random() * 9000).toString();
    remoteCodeDisplay.textContent = pairingCode;

    // The remote pairing pop-up remains visible until the WebSocket confirms a connection.
    // For this example, we will hide it after a long delay. In a real app,
    // the backend would signal when to hide this.
    // setTimeout(() => {
    //     remoteCodePopup.style.display = 'none';
    // }, 60000); // Hide after 1 minute for demonstration

    try {
        const response = await fetch('/api/getChannels.js');
        if (!response.ok) throw new Error('Network response was not ok');
        channelList = await response.json();

        if (channelList.length === 0) {
            throw new Error("Channel list is empty.");
        }

        shaka.polyfill.installAll();
        if (shaka.Player.isBrowserSupported()) {
            await initPlayer();
        } else {
            console.error('Browser not supported!');
        }

        document.addEventListener('keydown', handleKeyDown);
        clickOverlay.addEventListener('click', showAndHideInfo);
        populateChannelList();
        updateTimeDate();
        setInterval(updateTimeDate, 1000);

        exitConfirmBtn.addEventListener('click', handleExitConfirm);
        exitCancelBtn.addEventListener('click', handleExitCancel);

    } catch (error)
    {
        console.error("Failed to initialize app:", error);
        channelName.textContent = "Error";
        channelCategory.textContent = "Could not load channels.";
    }
}

// Function to handle commands received from the mobile remote via WebSocket
function handleRemoteCommand(event) {
    const command = JSON.parse(event.data);
    
    // Once the remote is paired, hide the code pop-up
    if (command.action === 'paired') {
        remoteCodePopup.style.display = 'none';
        return;
    }

    if (command.action !== 'remote-press') return;

    // Translate remote command to an action
    switch (command.key) {
        case 'up':
            if (isSidebarActive) moveFocus(-1); else changeChannel(1);
            break;
        case 'down':
            if (isSidebarActive) moveFocus(1); else changeChannel(-1);
            break;
        case 'left':
            toggleSidebar();
            break;
        case 'right':
            showExitPopup();
            break;
        case 'ok':
            if (isSidebarActive) selectChannelFromList(); else showAndHideInfo();
            break;
    }
}


async function initPlayer() {
    player = new shaka.Player(video);
    player.addEventListener('error', onErrorEvent);
    await loadChannel(channelList[currentChannelIndex]);
    showAndHideInfo();
}

function moveFocus(direction) {
    if (direction === 1) {
        currentFocusIndex = Math.min(channelList.length - 1, currentFocusIndex + 1);
    } else {
        currentFocusIndex = Math.max(0, currentFocusIndex - 1);
    }
    updateFocus();
}

function toggleSidebar() {
    if (isSidebarActive) {
        hideSidebar();
    } else {
        showSidebar();
    }
}

async function loadChannel(channel) {
    if (!channel) return;
    updateChannelInfo(channel);

    try {
        const streamResponse = await fetch(`/api/getStream.js?name=${encodeURIComponent(channel.name)}`);
        if (!streamResponse.ok) throw new Error(`Stream for ${channel.name} not found`);
        const streamData = await streamResponse.json();

        if (player.getMediaElement()) {
            await player.unload();
        }

        player.configure('drm.clearKeys', streamData.clearKey || {});
        await player.load(streamData.manifestUri);

        video.play();

    } catch (error) {
        console.error(`Failed to load stream for ${channel.name}:`, error);
        channelName.textContent = `Error loading ${channel.name}`;
        channelCategory.textContent = "Could not retrieve stream.";
    }
}

function updateChannelInfo(channel) {
    channelName.textContent = channel.name;
    channelCategory.textContent = channel.category;
}

function showAndHideInfo() {
    fadeOverlay.classList.add('show');
    liveplayLogo.classList.add('show');
    channelInfo.classList.add('show');
    liveIndicatorCorner.classList.add('show');
    clearTimeout(infoTimeout);
    infoTimeout = setTimeout(() => {
        fadeOverlay.classList.remove('show');
        liveplayLogo.classList.remove('show');
        channelInfo.classList.remove('show');
        liveIndicatorCorner.classList.remove('show');
    }, 4000);
}

function handleKeyDown(event) {
    event.preventDefault();

    if (isExitPopupActive) {
        // Handle exit popup navigation
        const currentFocus = document.activeElement;
        if (event.keyCode === 37) { // Left Arrow
            if (currentFocus === exitConfirmBtn) exitCancelBtn.focus();
        } else if (event.keyCode === 39) { // Right Arrow
            if (currentFocus === exitCancelBtn) exitConfirmBtn.focus();
        } else if (event.keyCode === 13) { // Enter
            currentFocus.click();
        } else if (event.keyCode === 8 || event.keyCode === 461 || event.keyCode === 10009) { // Back button
            handleExitCancel();
        }
    } else if (isSidebarActive) {
        // Handle sidebar navigation
        switch (event.keyCode) {
            case 37: hideSidebar(); break; // Left Arrow
            case 38: moveFocus(-1); break; // Up Arrow
            case 40: moveFocus(1); break; // Down Arrow
            case 13: selectChannelFromList(); break; // Enter
            case 8: case 461: case 10009: hideSidebar(); break; // Back button
        }
    } else {
        // Handle main video player navigation
        switch (event.keyCode) {
            case 38: changeChannel(1); break; // Up Arrow
            case 40: changeChannel(-1); break; // Down Arrow
            case 37: toggleSidebar(); break; // Left Arrow
            case 39: showExitPopup(); break; // Right Arrow
            case 13: showAndHideInfo(); break; // Enter
            case 8: case 461: case 10009: showExitPopup(); break; // Back button
        }
    }
}

function changeChannel(direction) {
    currentChannelIndex = (currentChannelIndex + direction + channelList.length) % channelList.length;
    loadChannel(channelList[currentChannelIndex]);
    showAndHideInfo();
}

function populateChannelList() {
    channelListContainer.innerHTML = '';
    channelList.forEach((channel, index) => {
        const li = document.createElement('li');
        li.dataset.index = index;
        li.innerHTML = `<span>${channel.name}</span><span class="sidebar-live-icon"><span class="material-symbols-outlined">sensors</span></span>`;
        li.addEventListener('click', () => {
            currentFocusIndex = index;
            selectChannelFromList();
        });
        channelListContainer.appendChild(li);
    });
}

function showSidebar() {
    if (isSidebarActive) return;
    isSidebarActive = true;
    currentFocusIndex = currentChannelIndex;
    sidebar.classList.add('show');
    updateFocus();
}

function hideSidebar() {
    isSidebarActive = false;
    sidebar.classList.remove('show');
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
        showAndHideInfo();
    }
    hideSidebar();
}

function updateTimeDate() {
    const now = new Date();
    const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const date = now.toLocaleDateString([], { month: 'short', day: 'numeric' });
    timeDateElement.textContent = `${date}, ${time}`;
}

function showExitPopup() {
    isExitPopupActive = true;
    exitPopupOverlay.classList.add('show');
    exitCancelBtn.focus();
}

function hideExitPopup() {
    isExitPopupActive = false;
    exitPopupOverlay.classList.remove('show');
}

function handleExitConfirm() {
    window.location.href = 'about:blank';
}
function handleExitCancel() {
    hideExitPopup();
}
function onErrorEvent(event) { onError(event.detail); }
function onError(error) { console.error('Shaka Player Error:', error.code, 'object', error); }

document.addEventListener('DOMContentLoaded', init);
