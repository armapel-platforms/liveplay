document.addEventListener('DOMContentLoaded', async () => {

    const createRipple = (event) => {
        const target = event.currentTarget;
        const circle = document.createElement("span");
        const diameter = Math.max(target.clientWidth, target.clientHeight);
        const radius = diameter / 2;
        const rect = target.getBoundingClientRect();
        circle.style.width = circle.style.height = `${diameter}px`;
        circle.style.left = `${event.clientX - rect.left - radius}px`;
        circle.style.top = `${event.clientY - rect.top - radius}px`;
        circle.classList.add("ripple");
        const ripple = target.getElementsByClassName("ripple")[0];
        if (ripple) { ripple.remove(); }
        target.appendChild(circle);
    };

    document.querySelectorAll('.icon-link, #minimized-player, .back-link, .channel-logo-bg').forEach(elem => elem.addEventListener("click", createRipple));

    // --- General UI Elements ---
    const header = document.querySelector('header');
    const menuBtn = document.getElementById('menu-btn');
    const floatingMenu = document.getElementById('floating-menu');
    const authPopup = document.getElementById('auth-popup-overlay');
    const closePopupBtn = document.getElementById('close-popup');

    // --- Player Elements ---
    const desktopVideoElement = document.getElementById('video-player-desktop');
    const desktopPlayerWrapper = document.getElementById('video-player-wrapper-desktop');
    const desktopYoutubePlayer = document.getElementById('youtube-player-desktop');
    const desktopInfoContainer = document.getElementById('player-info-desktop');

    const mobilePlayerView = document.getElementById('player-view');
    const mobileVideoElement = document.getElementById('video-player-mobile');
    const mobilePlayerWrapper = document.getElementById('video-player-wrapper-mobile');
    const mobileYoutubePlayer = document.getElementById('youtube-player-mobile');
    const mobileInfoContainer = document.getElementById('player-info-mobile');

    const minimizedPlayer = document.getElementById('minimized-player');
    const minimizeBtn = document.getElementById('minimize-player-btn');
    const exitBtn = document.getElementById('exit-player-btn');

    // --- State Variables ---
    let streamsData = [];
    let playerDesktop = null, uiDesktop = null;
    let playerMobile = null, uiMobile = null;
    let currentUser = null;
    let activeStream = null;
    let isDesktop = window.innerWidth >= 1024;

    window.addEventListener('resize', () => { isDesktop = window.innerWidth >= 1024; });

    // --- Core Functions ---

    // Initializes a new Shaka Player instance for a given video element.
    const initShakaPlayer = async (videoElement, wrapperElement) => {
        shaka.polyfill.installAll();
        if (!shaka.Player.isBrowserSupported()) {
            console.error('Browser not supported!');
            return { player: null, ui: null };
        }
        const player = new shaka.Player(videoElement);
        const ui = new shaka.ui.Overlay(player, wrapperElement, videoElement);
        ui.getControls();
        player.addEventListener('error', (e) => console.error('Shaka Player Error', e.detail));
        return { player, ui };
    };

    // Main dispatcher to open player based on device
    const openPlayer = (stream) => {
        if (!currentUser) {
            showAuthPopup();
            return;
        }
        const channelName = encodeURIComponent(stream.name.replace(/\s+/g, '-'));
        history.pushState({ channel: stream.name }, ``, `/home?play=${channelName}`);
        activeStream = stream;

        if (isDesktop) {
            openDesktopPlayer(stream);
        } else {
            openMobilePlayer(stream);
        }
    };
    
    // Handles playing a stream on Desktop
    const openDesktopPlayer = async (stream) => {
        if (!playerDesktop) {
            ({ player: playerDesktop, ui: uiDesktop } = await initShakaPlayer(desktopVideoElement, desktopPlayerWrapper));
        }
        
        if (stream.type === 'youtube') {
            if (playerDesktop) await playerDesktop.unload();
            if (uiDesktop) uiDesktop.setEnabled(false);
            desktopVideoElement.style.display = 'none';
            desktopYoutubePlayer.src = stream.embedUrl;
            desktopYoutubePlayer.style.display = 'block';
        } else {
            desktopYoutubePlayer.style.display = 'none';
            desktopYoutubePlayer.src = '';
            desktopVideoElement.style.display = 'block';
            if (uiDesktop) uiDesktop.setEnabled(true);

            try {
                const response = await fetch(`/api/getStream?name=${encodeURIComponent(stream.name)}`);
                if (!response.ok) throw new Error(`Stream data not found`);
                const secureData = await response.json();
                playerDesktop.configure({ drm: { clearKeys: secureData.clearKey || {} } });
                await playerDesktop.load(secureData.manifestUri);
            } catch (e) {
                console.error('Player Load Error:', e);
            }
        }
        updatePlayerInfo(stream, 'desktop');
    };

    // Handles playing a stream on Mobile
    const openMobilePlayer = async (stream) => {
        if (!playerMobile) {
            ({ player: playerMobile, ui: uiMobile } = await initShakaPlayer(mobileVideoElement, mobilePlayerWrapper));
        }
        
        if (stream.type === 'youtube') {
            if (playerMobile) await playerMobile.unload();
            if (uiMobile) uiMobile.setEnabled(false);
            mobileVideoElement.style.display = 'none';
            mobileYoutubePlayer.src = stream.embedUrl;
            mobileYoutubePlayer.style.display = 'block';
        } else {
            mobileYoutubePlayer.style.display = 'none';
            mobileYoutubePlayer.src = '';
            mobileVideoElement.style.display = 'block';
            if (uiMobile) uiMobile.setEnabled(true);
            
            try {
                const response = await fetch(`/api/getStream?name=${encodeURIComponent(stream.name)}`);
                if (!response.ok) throw new Error(`Stream data not found`);
                const secureData = await response.json();
                playerMobile.configure({ drm: { clearKeys: secureData.clearKey || {} } });
                await playerMobile.load(secureData.manifestUri);
            } catch (e) {
                console.error('Player Load Error:', e);
            }
        }
        updatePlayerInfo(stream, 'mobile');
        minimizedPlayer.classList.remove('active');
        mobilePlayerView.classList.add('active');
    };

    // Updates the channel name, category, etc., for the correct player
    const updatePlayerInfo = (stream, device) => {
        if (device === 'desktop') {
            desktopInfoContainer.querySelector('h3').textContent = stream.name;
            desktopInfoContainer.querySelector('p').textContent = stream.category;
            desktopInfoContainer.querySelector('.live-indicator').style.display = 'flex';
        } else { // mobile
            mobileInfoContainer.querySelector('h3').textContent = stream.name;
            mobileInfoContainer.querySelector('p').textContent = stream.category;
            // Minimized player
            document.getElementById('minimized-player-logo').src = stream.logo;
            document.getElementById('minimized-player-name').textContent = stream.name;
            document.getElementById('minimized-player-category').textContent = stream.category;
        }
    };

    const minimizePlayer = () => {
        if (mobilePlayerView.classList.contains('active')) {
            mobilePlayerView.classList.remove('active');
            minimizedPlayer.classList.add('active');
        }
    };

    const restorePlayer = (e) => {
        if (e.target.closest('#exit-player-btn')) return;
        if (minimizedPlayer.classList.contains('active')) {
            minimizedPlayer.classList.remove('active');
            mobilePlayerView.classList.add('active');
        }
    };
    
    const closePlayer = async (e) => {
        if(e) e.stopPropagation();
        
        // Unload both players to be safe
        if (playerDesktop) await playerDesktop.unload();
        if (playerMobile) await playerMobile.unload();

        // Hide mobile UI
        mobilePlayerView.classList.remove('active');
        minimizedPlayer.classList.remove('active');

        // Reset desktop UI
        desktopInfoContainer.querySelector('h3').textContent = 'Select a Channel';
        desktopInfoContainer.querySelector('p').textContent = 'No channel selected';
        desktopInfoContainer.querySelector('.live-indicator').style.display = 'none';
        desktopVideoElement.poster = "/logo/attention.png";
        
        // Clean up iframes
        if (desktopYoutubePlayer) desktopYoutubePlayer.src = '';
        if (mobileYoutubePlayer) mobileYoutubePlayer.src = '';

        activeStream = null;
        history.pushState({}, '', '/home');
    };

    // --- Page Initialization & Event Listeners ---
    const initializePage = async () => {
        try {
            const response = await fetch('/api/getChannels');
            if (!response.ok) throw new Error('Network response was not ok');
            const publicStreams = await response.json();
            streamsData = [...publicStreams, ...yt_live];
        } catch (error) {
            console.error("Failed to fetch channel list:", error);
            streamsData = [...yt_live]; // Fallback
        }

        // Render Channel Categories and Pills
        const categoryPillsContainer = document.querySelector('.category-pills');
        if (categoryPillsContainer) {
            const categories = ['ALL', ...new Set(streamsData.map(s => s.category))];
            const categoryIcons = { ALL: 'apps', LOCAL: 'tv_gen', NEWS: 'news', ENTERTAINMENT: 'theater_comedy', MOVIES: 'theaters', SPORTS: 'sports_basketball', KIDS: 'smart_toy', INFOTAINMENT: 'emoji_objects', 'LIFESTYLE + FOOD': 'restaurant', MUSIC: 'music_note', 'ACTION + CRIME': 'local_police', OVERSEAS: 'globe', RELIGIOUS: 'church', 'NATURE + ANIMAL': 'pets', 'YOUTUBE LIVE': 'smart_display' };
            
            categoryPillsContainer.innerHTML = '';
            categories.forEach(category => {
                const pill = document.createElement('button');
                pill.className = 'pill';
                if (category === 'ALL') pill.classList.add('active');
                pill.dataset.category = category;
                pill.innerHTML = `<span class="material-symbols-outlined">${categoryIcons[category] || 'emergency'}</span>`;
                pill.addEventListener('click', (e) => {
                    createRipple(e);
                    document.querySelector('.pill.active')?.classList.remove('active');
                    pill.classList.add('active');
                    renderChannelRows(category);
                });
                categoryPillsContainer.appendChild(pill);
            });
            renderChannelRows('ALL');
        }

        const params = new URLSearchParams(window.location.search);
        const channelToPlay = params.get('play');
        if (channelToPlay && currentUser) {
            const streamToPlay = streamsData.find(s => s.name.replace(/\s+/g, '-') === channelToPlay);
            if (streamToPlay) openPlayer(streamToPlay);
        } else if (channelToPlay && !currentUser) {
             history.replaceState({}, '', '/home'); 
             showAuthPopup();
        }
    };

    const renderChannelRows = (filter) => {
        const channelListingsContainer = document.getElementById('channel-listings');
        if (!channelListingsContainer) return;
        channelListingsContainer.innerHTML = '';
        const filteredStreams = (filter === 'ALL') ? streamsData : streamsData.filter(s => s.category === filter);
        const groupedByCategory = filteredStreams.reduce((acc, stream) => {
            (acc[stream.category] = acc[stream.category] || []).push(stream);
            return acc;
        }, {});

        const categories = ['LOCAL', 'NEWS', 'ENTERTAINMENT', 'MOVIES', 'SPORTS', 'KIDS', 'INFOTAINMENT', 'LIFESTYLE + FOOD', 'MUSIC', 'ACTION + CRIME', 'OVERSEAS', 'RELIGIOUS', 'NATURE + ANIMAL', 'YOUTUBE LIVE'];
        const categoryIcons = { LOCAL: 'tv_gen', NEWS: 'news', ENTERTAINMENT: 'theater_comedy', MOVIES: 'theaters', SPORTS: 'sports_basketball', KIDS: 'smart_toy', INFOTAINMENT: 'emoji_objects', 'LIFESTYLE + FOOD': 'restaurant', MUSIC: 'music_note', 'ACTION + CRIME': 'local_police', OVERSEAS: 'globe', RELIGIOUS: 'church', 'NATURE + ANIMAL': 'pets', 'YOUTUBE LIVE': 'smart_display' };
        
        const orderedCategories = categories.filter(c => groupedByCategory[c]);
        orderedCategories.forEach(category => {
            const section = document.createElement('div');
            section.className = 'category-section';
            section.innerHTML = `<div class="category-title"><span class="material-symbols-outlined">${categoryIcons[category] || 'emergency'}</span><h3>${category}</h3></div>`;
            const row = document.createElement('div');
            row.className = 'channel-row';
            groupedByCategory[category].forEach(stream => {
                const card = document.createElement('div');
                card.className = 'channel-card';
                const logoBg = document.createElement('div');
                logoBg.className = 'channel-logo-bg';
                logoBg.innerHTML = `<img src="${stream.logo}" alt="${stream.name}" class="channel-logo">`;
                logoBg.addEventListener('click', () => openPlayer(stream));
                card.appendChild(logoBg);
                row.appendChild(card);
            });
            section.appendChild(row);
            channelListingsContainer.appendChild(section);
        });
    };
    
    // --- Auth & Menu Setup ---
    currentUser = await window.auth.getCurrentUser();
    renderMenu(currentUser);
    window.auth.onAuthStateChange(user => { currentUser = user; renderMenu(user); });
    
    // --- Final Setup ---
    if (authPopup) authPopup.addEventListener('click', (e) => { if (e.target === authPopup) hideAuthPopup(); });
    if (closePopupBtn) closePopupBtn.addEventListener('click', hideAuthPopup);
    if (menuBtn) menuBtn.addEventListener('click', (e) => { e.stopPropagation(); floatingMenu.classList.toggle('active'); });
    document.addEventListener('click', (e) => { if (floatingMenu.classList.contains('active') && !floatingMenu.contains(e.target) && e.target !== menuBtn) floatingMenu.classList.remove('active'); });
    if(minimizeBtn) minimizeBtn.addEventListener('click', minimizePlayer);
    if(minimizedPlayer) minimizedPlayer.addEventListener('click', restorePlayer);
    if(exitBtn) exitBtn.addEventListener('click', closePlayer);
    
    await initializePage();
});
