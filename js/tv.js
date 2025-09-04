// --- 1. PASTE YOUR SUPABASE PROJECT DETAILS HERE ---
const SUPABASE_URL = 'https://efqaangjtclacltygaqr.supabase.co'; // Paste your URL
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmcWFhbmdqdGNsYWNsdHlnYXFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5NjEwNzQsImV4cCI6MjA3MjUzNzA3NH0.Q3-UEvj23cnqUhBBGs7KZhsgN3y65bbGfUdZelDrubw'; // Paste your anon public key

// --- 2. APPLICATION LOGIC ---
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Global state variables
let pairingCode;
let roomSubscription;
let player;
let channelList = []; // This will be filled by your API
let currentChannelIndex = 0;
let isSidebarActive = false;
let currentFocusIndex = 0;
let uiTimeout;

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
        pairingCode = await createUniqueRoom();
        remoteCodeDisplay.textContent = pairingCode;
        listenForRemote();
        window.addEventListener('beforeunload', cleanupRoom);
    } catch (error) {
        console.error("Pairing Error:", error);
        remoteCodeDisplay.textContent = "ERR!";
    }
}

/** Creates a unique 4-digit code in the Supabase 'rooms' table */
async function createUniqueRoom() {
    let attempts = 0;
    while (attempts < 10) {
        const code = Math.floor(1000 + Math.random() * 9000);
        const { error } = await supabaseClient.from('rooms').insert({ id: code });
        if (!error) return code;
        if (error.code === '23505') attempts++;
        else throw error;
    }
    throw new Error('Failed to generate a unique room code.');
}

/** Subscribes to database changes to listen for the remote */
function listenForRemote() {
    roomSubscription = supabaseClient.channel(`room-${pairingCode}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${pairingCode}` },
            (payload) => {
                const { status, command } = payload.new;
                if (status === 'remote_connected' && !player) { // Check if player is already started
                    console.log("Remote Connected! Starting Player...");
                    remoteCodePopup.classList.add('hidden');
                    startPlayer();
                }
                if (command?.key) handleRemoteCommand(command.key);
            }
        )
        .subscribe();
}

/** Handles incoming commands from the remote */
function handleRemoteCommand(key) {
    console.log(`Remote command received: ${key}`);
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
    try {
        // Fetch the channel list from your API
        const response = await fetch('/api/getChannels.js');
        if (!response.ok) throw new Error('Failed to fetch channel list');
        channelList = await response.json();
        if (channelList.length === 0) throw new Error('Channel list is empty.');

        shaka.polyfill.installAll();
        if (!shaka.Player.isBrowserSupported()) throw new Error('Browser not supported for Shaka Player');

        player = new shaka.Player(video);
        player.addEventListener('error', onErrorEvent);

        populateChannelList();
        updateTimeDate();
        setInterval(updateTimeDate, 1000 * 30);
        
        await loadChannel(channelList[currentChannelIndex]);
    } catch (error) {
        console.error("Player failed to start:", error);
        channelName.textContent = "Error";
        channelCategory.textContent = "Could not start the player.";
    }
}

/** Loads a specified channel into the player */
async function loadChannel(channel) {
    if (!channel) return;
    updateChannelInfo(channel);
    try {
        // Fetch the specific stream data (manifest + key) from your API
        const streamResponse = await fetch(`/api/getStream.js?name=${encodeURIComponent(channel.name)}`);
        if (!streamResponse.ok) throw new Error(`Stream data for ${channel.name} not found`);
        const streamData = await streamResponse.json();

        // Configure Shaka Player with the fetched DRM keys
        if (streamData.clearKey) {
            player.configure('drm.clearKeys', streamData.clearKey);
        }

        await player.load(streamData.manifestUri);
        showAndHideUi();
    } catch (error) {
        console.error(`Error loading channel ${channel.name}:`, error);
        channelName.textContent = `Error loading ${channel.name}`;
        channelCategory.textContent = "Cannot play this stream.";
    }
}

// All other UI functions (changeChannel, updateChannelInfo, showAndHideUi, sidebar logic, etc.)
// remain the same as in the previous version. They will now use the `channelList`
// that was populated from your API.

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
    const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const date = now.toLocaleDateString([], { month: 'short', day: 'numeric' });
    timeDateElement.textContent = `${date}, ${time}`;
}

async function cleanupRoom() {
    if (roomSubscription) supabaseClient.removeChannel(roomSubscription);
    if (pairingCode) await supabaseClient.from('rooms').delete().eq('id', pairingCode);
}

function onErrorEvent(event) {
    console.error('Shaka Player Error:', event.detail);
}

document.addEventListener('DOMContentLoaded', init);
