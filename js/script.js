document.addEventListener('DOMContentLoaded', async () => {

    const createRipple = (event) => {
        const target = event.currentTarget;
        // Ensure the ripple effect doesn't trigger on child elements of the intended target
        if (event.target !== target) return;
        
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

    // --- General UI Elements & State ---
    const header = document.querySelector('header');
    const menuBtn = document.getElementById('menu-btn');
    const floatingMenu = document.getElementById('floating-menu');
    const authPopup = document.getElementById('auth-popup-overlay');
    const closePopupBtn = document.getElementById('close-popup');
    let streamsData = [];
    let currentUser = null;
    const isDesktop = window.innerWidth >= 1024;

    // --- Desktop Player Elements ---
    const desktopPlayerWrapper = document.getElementById('video-player-wrapper-desktop');
    const desktopVideoElement = document.getElementById('video-player-desktop');
    const desktopYoutubePlayer = document.getElementById('youtube-player-desktop');
    const desktopInfoContainer = document.getElementById('player-info-desktop');
    let playerDesktop = null, uiDesktop = null;

    // --- Mobile Player Elements ---
    const mobilePlayerView = document.getElementById('player-view');
    const mobilePlayerWrapper = document.getElementById('video-player-wrapper-mobile');
    const mobileVideoElement = document.getElementById('video-player-mobile');
    const mobileYoutubePlayer = document.getElementById('youtube-player-mobile');
    const mobileInfoContainer = document.getElementById('player-info-mobile');
    const minimizedPlayer = document.getElementById('minimized-player');
    const minimizeBtn = document.getElementById('minimize-player-btn');
    const exitBtn = document.getElementById('exit-player-btn');
    let playerMobile = null, uiMobile = null;

    // --- Core Functions ---

    const initShakaPlayer = async (videoElement, wrapperElement) => {
        shaka.polyfill.installAll();
        if (!shaka.Player.isBrowserSupported()) {
            console.error('Browser not supported!');
            return { player: null, ui: null };
        }
        const player = new shaka.Player(videoElement);
        const ui = new shaka.ui.Overlay(player, wrapperElement, videoElement);
        ui.getControls();
        player.addEventListener('error', (e) => console.error('Shaka Player Error:', e.detail));
        return { player, ui };
    };

    const playStream = async (player, stream) => {
        try {
            const response = await fetch(`/api/getStream?name=${encodeURIComponent(stream.name)}`);
            if (!response.ok) throw new Error(`Stream data not found for ${stream.name}`);
            const secureData = await response.json();
            player.configure({ drm: { clearKeys: secureData.clearKey || {} } });
            await player.load(secureData.manifestUri);
        } catch (e) {
            console.error('Player Load Error:', e);
        }
    };
    
    const handleChannelClick = (stream) => {
        if (!currentUser) {
            showAuthPopup();
            return;
        }
        const channelName = encodeURIComponent(stream.name.replace(/\s+/g, '-'));
        history.pushState({ channel: stream.name }, ``, `/home?play=${channelName}`);
        
        if (isDesktop) {
            openDesktopPlayer(stream);
        } else {
            openMobilePlayer(stream);
        }
    };

    // --- Desktop-Specific Logic ---

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
            await playStream(playerDesktop, stream);
        }
        desktopInfoContainer.querySelector('h3').textContent = stream.name;
        desktopInfoContainer.querySelector('p').textContent = stream.category;
        desktopInfoContainer.querySelector('.live-indicator').style.display = 'flex';
    };

    // --- Mobile-Specific Logic ---

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
            await playStream(playerMobile, stream);
        }

        mobileInfoContainer.querySelector('h3').textContent = stream.name;
        mobileInfoContainer.querySelector('p').textContent = stream.category;
        document.getElementById('minimized-player-logo').src = stream.logo;
        document.getElementById('minimized-player-name').textContent = stream.name;
        document.getElementById('minimized-player-category').textContent = stream.category;
        
        minimizedPlayer.classList.remove('active');
        mobilePlayerView.classList.add('active');
    };

    const minimizeMobilePlayer = () => {
        mobilePlayerView.classList.remove('active');
        minimizedPlayer.classList.add('active');
    };

    const restoreMobilePlayer = (e) => {
        if (e.target.closest('#exit-player-btn')) return;
        minimizedPlayer.classList.remove('active');
        mobilePlayerView.classList.add('active');
    };

    const closeMobilePlayer = async (e) => {
        if(e) e.stopPropagation();
        if (playerMobile) await playerMobile.unload();
        mobilePlayerView.classList.remove('active');
        minimizedPlayer.classList.remove('active');
        mobileYoutubePlayer.src = '';
        history.pushState({}, '', '/home');
    };

    // --- Page Setup and Initialization ---

    const renderChannelRows = () => {
        const channelListingsContainer = document.getElementById('channel-listings');
        const filter = document.querySelector('.pill.active')?.dataset.category || 'ALL';
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
                logoBg.addEventListener('click', (e) => {
                    createRipple(e);
                    handleChannelClick(stream);
                });
                card.appendChild(logoBg);
                row.appendChild(card);
            });
            section.appendChild(row);
            channelListingsContainer.appendChild(section);
        });
    };
    
    // --- Auth, Menu, and General UI Setup ---
    
    const showAuthPopup = () => { if (!currentUser && authPopup) authPopup.classList.add('active'); };
    const hideAuthPopup = () => { if (authPopup) authPopup.classList.remove('active'); };

    const renderMenu = (user) => {
        let menuContent = '';
        if (user) {
            menuContent = `
                <div class="menu-header">Hi, ${user.first_name || 'User'}</div>
                <div class="menu-divider"></div>
                <ul>
                    <li><a href="/home/manage-account"><span class="material-symbols-outlined">manage_accounts</span> My Account</a></li>
                </ul>`;
        } else {
            menuContent = `
                <div class="menu-header">Hi, Guest</div>
                <div class="menu-divider"></div>
                <ul>
                    <li><a href="/home/login"><span class="material-symbols-outlined">login</span> Log In / Sign Up</a></li>
                </ul>`;
        }
        menuContent += `
            <div class="menu-divider"></div>
            <ul>
                <li><a href="/home/about-us"><span class="material-symbols-outlined">info</span> About Us</a></li>
                <li><a href="/home/faq"><span class="material-symbols-outlined">quiz</span> FAQ</a></li>
                <li><a href="/home/privacy-policy"><span class="material-symbols-outlined">shield</span> Privacy Policy</a></li>
                <li><a href="/home/terms-of-service"><span class="material-symbols-outlined">gavel</span> Terms of Service</a></li>
            </ul>`;
        
        if (floatingMenu) floatingMenu.innerHTML = menuContent;
        
        if (floatingMenu) {
            floatingMenu.querySelectorAll('li').forEach(li => {
                const link = li.querySelector('a');
                li.addEventListener('mousedown', () => li.classList.add('active-press'));
                li.addEventListener('touchstart', () => li.classList.add('active-press'));
                const releaseAction = (e) => {
                    li.classList.remove('active-press');
                    if (link && link.href) setTimeout(() => { window.location.href = link.href; }, 150);
                };
                li.addEventListener('mouseup', releaseAction);
                li.addEventListener('touchend', releaseAction);
                li.addEventListener('mouseleave', () => li.classList.remove('active-press'));
            });
        }
    };

    const initializePage = async () => {
        currentUser = await window.auth.getCurrentUser();
        renderMenu(currentUser);
        window.auth.onAuthStateChange(user => { currentUser = user; renderMenu(user); });

        try {
            const response = await fetch('/api/getChannels');
            streamsData = await response.json();
            streamsData.push(...yt_live);
        } catch (error) {
            console.error("Failed to fetch channel list:", error);
            streamsData = [...yt_live];
        }

        // Initialize Slider
        const slider = document.querySelector('.slider');
        if (slider) {
            const slides = document.querySelectorAll('.slide');
            const dots = document.querySelectorAll('.slider-nav .dot');
            let currentSlide = 0;
            const showSlide = (index) => {
                slides.forEach((s) => s.classList.remove('active'));
                dots.forEach(d => d.classList.remove('active'));
                if (slides[index]) slides[index].classList.add('active');
                if (dots[index]) dots[index].classList.add('active');
            };
            const nextSlide = () => { currentSlide = (currentSlide + 1) % slides.length; showSlide(currentSlide); };
            dots.forEach((dot, index) => dot.addEventListener('click', () => { currentSlide = index; showSlide(currentSlide); }));
            setInterval(nextSlide, 5000);
        }

        // Initialize Pills and Channels
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
                    renderChannelRows();
                });
                categoryPillsContainer.appendChild(pill);
            });
        }
        
        renderChannelRows();

        // Check URL for a channel to autoplay
        const params = new URLSearchParams(window.location.search);
        const channelToPlay = params.get('play');
        if (channelToPlay) {
            const streamToPlay = streamsData.find(s => s.name.replace(/\s+/g, '-') === channelToPlay);
            if (streamToPlay) handleChannelClick(streamToPlay);
        }
    };
    
    // Attach all general event listeners
    if (authPopup) authPopup.addEventListener('click', (e) => { if (e.target === authPopup) hideAuthPopup(); });
    if (closePopupBtn) closePopupBtn.addEventListener('click', hideAuthPopup);
    if (menuBtn) menuBtn.addEventListener('click', (e) => { e.stopPropagation(); floatingMenu.classList.toggle('active'); });
    document.addEventListener('click', (e) => { if (floatingMenu.classList.contains('active') && !floatingMenu.contains(e.target) && e.target !== menuBtn) floatingMenu.classList.remove('active'); });

    // Attach device-specific listeners
    if (!isDesktop) {
        minimizeBtn.addEventListener('click', minimizeMobilePlayer);
        minimizedPlayer.addEventListener('click', restoreMobilePlayer);
        exitBtn.addEventListener('click', closeMobilePlayer);
        window.addEventListener('scroll', () => header.classList.toggle('scrolled', window.scrollY > 10));
    }

    // Start the application
    initializePage();
});
