const SUPABASE_URL = 'https://sstlszevsvtxghumzujx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNzdGxzemV2c3Z0eGdodW16dWp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5NTc2MzcsImV4cCI6MjA3MjUzMzYzN30.cJ68NKB1Oh2DMuazoXV36tKyIjXmTDojTy_gnLXLzsA';

const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
let pairingCode;
let roomSubscription;
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

let scrollTimeout;
let scrollInterval;
const scrollDelay = 400;
const scrollSpeed = 100;

/**
 * Main initialization function.
 */
async function init() {
    try {
        channelName.textContent = "Generating secure code...";
        channelCategory.textContent = "Please wait...";

        // Create a unique room in the database for the remote to find
        pairingCode = await createUniqueRoom();
        remoteCodeDisplay.textContent = pairingCode;
        channelName.textContent = "Loading..."; // Revert to original loading text
        channelCategory.textContent = "";

        // Listen for commands and status changes from the remote
        listenForRemote();

        // Ensure the room is deleted from the database when the tab is closed
        window.addEventListener('beforeunload', cleanupRoom);

        // Fetch channel list and initialize the player
        const response = await fetch('/api/getChannels.js');
        if (!response.ok) throw new Error('Network response was not ok');
        channelList = await response.json();

        if (channelList.length === 0) throw new Error("Channel list is empty.");

        shaka.polyfill.installAll();
        if (shaka.Player.isBrowserSupported()) await initPlayer();
        else console.error('Browser not supported!');

        document.addEventListener('keydown', handleKeyDown);
        clickOverlay.addEventListener('click', showAndHideInfo);
        populateChannelList();
        updateTimeDate();
        setInterval(updateTimeDate, 1000);

        exitConfirmBtn.addEventListener('click', handleExitConfirm);
        exitCancelBtn.addEventListener('click', handleExitCancel);

    } catch (error) {
        console.error("Critical initialization error:", error);
        channelName.textContent = "Connection Error";
        channelCategory.textContent = "Could not connect to remote service. Please refresh.";
        remoteCodePopup.style.display = 'none';
    }
}

/**
 * Creates a new row in the 'rooms' table with a guaranteed unique 4-digit code.
 */
async function createUniqueRoom() {
    let attempts = 0;
    while (attempts < 5) {
        const code = Math.floor(1000 + Math.random() * 9000);
        const { error } = await supabase.from('rooms').insert({ id: code });

        if (!error) {
            console.log(`Room created successfully with code: ${code}`);
            return code;
        }
        if (error.code === '23505') { // PostgreSQL code for unique violation
            console.warn(`Code collision for ${code}. Retrying...`);
            attempts++;
        } else {
            throw error;
        }
    }
    throw new Error('Failed to generate a unique room code.');
}

/**
 * Subscribes to database changes for the current room to listen for the remote.
 */
function listenForRemote() {
    roomSubscription = supabase.channel(`room-${pairingCode}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${pairingCode}` },
            (payload) => {
                const { status, command } = payload.new;
                if (status === 'remote_connected') {
                    console.log("Remote has connected!");
                    remoteCodePopup.style.display = 'none';
                }
                if (command?.key) {
                    handleRemoteCommand(command.key);
                }
            }
        )
        .subscribe();
}

/**
 * Executes player actions based on commands from the remote.
 */
function handleRemoteCommand(key) {
    console.log(`Executing remote command: ${key}`);
    switch (key) {
        case 'up': isSidebarActive ? moveFocus(-1) : changeChannel(1); break;
        case 'down': isSidebarActive ? moveFocus(1) : changeChannel(-1); break;
        case 'left': isSidebarActive ? hideSidebar() : (isExitPopupActive ? exitCancelBtn.focus() : toggleSidebar()); break;
        case 'right': isSidebarActive ? selectChannelFromList() : (isExitPopupActive ? exitConfirmBtn.focus() : showExitPopup()); break;
        case 'ok':
            if (isExitPopupActive) document.activeElement.click();
            else if (isSidebarActive) selectChannelFromList();
            else showAndHideInfo();
            break;
    }
}

/**
 * Deletes the room from the database upon closing the page.
 */
async function cleanupRoom() {
    if (roomSubscription) {
        supabase.removeChannel(roomSubscription);
    }
    if (pairingCode) {
        await supabase.from('rooms').delete().eq('id', pairingCode);
        console.log(`Room ${pairingCode} has been cleaned up.`);
    }
}

// --- ALL ORIGINAL PLAYER AND UI FUNCTIONS ---

async function initPlayer() {
    player = new shaka.Player(video);
    player.addEventListener('error', onErrorEvent);
    await loadChannel(channelList[currentChannelIndex]);
    showAndHideInfo();
}

function moveFocus(direction) {
    currentFocusIndex = (currentFocusIndex + direction + channelList.length) % channelList.length;
    updateFocus();
}

function startScrolling(direction) {
    stopScrolling();
    moveFocus(direction);
    scrollTimeout = setTimeout(() => {
        scrollInterval = setInterval(() => moveFocus(direction), scrollSpeed);
    }, scrollDelay);
}

function stopScrolling() {
    clearTimeout(scrollTimeout);
    clearInterval(scrollInterval);
}

function toggleSidebar() {
    isSidebarActive ? hideSidebar() : showSidebar();
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
        const currentFocus = document.activeElement;
        if (event.keyCode === 37) { if (currentFocus === exitConfirmBtn) exitCancelBtn.focus(); }
        else if (event.keyCode === 39) { if (currentFocus === exitCancelBtn) exitConfirmBtn.focus(); }
        else if (event.keyCode === 13) { currentFocus.click(); }
        else if ([8, 461, 10009].includes(event.keyCode)) { handleExitCancel(); }
    } else if (isSidebarActive) {
        switch (event.keyCode) {
            case 37: hideSidebar(); break;
            case 38: moveFocus(-1); break;
            case 40: moveFocus(1); break;
            case 13: selectChannelFromList(); break;
            case 8: case 461: case 10009: hideSidebar(); break;
        }
    } else {
        switch (event.keyCode) {
            case 38: changeChannel(1); break;
            case 40: changeChannel(-1); break;
            case 37: toggleSidebar(); break;
            case 39: showExitPopup(); break;
            case 13: showAndHideInfo(); break;
            case 8: case 461: case 10009: showExitPopup(); break;
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

function handleExitConfirm() { window.location.href = 'about:blank'; }
function handleExitCancel() { hideExitPopup(); }
function onErrorEvent(event) { onError(event.detail); }
function onError(error) { console.error('Shaka Player Error:', error.code, 'object', error); }

// Start the application
document.addEventListener('DOMContentLoaded', init);
