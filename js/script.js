document.addEventListener('DOMContentLoaded', async () => {

    // --- RIPPLE EFFECT FUNCTION ---
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
    }

    // --- ATTACH RIPPLE TO STATIC ELEMENTS ---
    const staticRippleElements = document.querySelectorAll('.icon-link, .floating-menu a, #minimized-player, .back-link, .social-icon, .video-player-container, .pill');
    staticRippleElements.forEach(elem => elem.addEventListener("click", createRipple));

    // --- GLOBAL ELEMENTS ---
    const menuBtn = document.getElementById('menu-btn');
    const floatingMenu = document.getElementById('floating-menu');
    const streamsData = streams;
    const videoElement = document.getElementById('video-player');
    const playerWrapper = document.getElementById('video-player-wrapper');
    let player = null;
    let ui = null;

    // --- MENU LOGIC ---
    if (menuBtn) {
        menuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            floatingMenu.classList.toggle('active');
        });
    }
    document.addEventListener('click', (e) => {
        if (floatingMenu && floatingMenu.classList.contains('active') && !floatingMenu.contains(e.target) && e.target !== menuBtn) {
            floatingMenu.classList.remove('active');
        }
    });

    // --- FEATURED SLIDER LOGIC ---
    const slider = document.querySelector('.slider');
    if (slider) {
        const slides = document.querySelectorAll('.slide');
        const dots = document.querySelectorAll('.slider-nav .dot');
        let currentSlide = 0;
        const slideInterval = 5000;
        const showSlide = (index) => {
            slides.forEach((slide, i) => slide.classList.remove('active'));
            dots.forEach(dot => dot.classList.remove('active'));
            slides[index].classList.add('active');
            dots[index]?.classList.add('active');
        };
        const nextSlide = () => {
            currentSlide = (currentSlide + 1) % slides.length;
            showSlide(currentSlide);
        };
        dots.forEach((dot, index) => {
            dot.addEventListener('click', () => {
                currentSlide = index;
                showSlide(currentSlide);
            });
        });
        setInterval(nextSlide, slideInterval);
    }
    
    // --- CATEGORY & CHANNEL RENDERING ---
    const categoryPillsContainer = document.querySelector('.category-pills');
    const channelListingsContainer = document.getElementById('channel-listings');

    if (categoryPillsContainer && channelListingsContainer) {
        const categories = ['ALL', 'GENERAL', 'NEWS', 'ENTERTAINMENT', 'MOVIES', 'SPORTS', 'KIDS', 'EDUCATIONAL', 'LIFESTYLE + FOOD', 'MUSIC', 'ACTION + CRIME', 'OVERSEAS', 'RELIGION', 'NATURE + ANIMAL'];
        const categoryIcons = {
            ALL: 'apps', GENERAL: 'tv_gen', NEWS: 'newspaper', ENTERTAINMENT: 'movie',
            SPORTS: 'sports_basketball', MOVIES: 'theaters', KIDS: 'smart_toy',
            EDUCATIONAL: 'school', 'LIFESTYLE + FOOD': 'restaurant', MUSIC: 'music_note',
            'ACTION + CRIME': 'local_police', OVERSEAS: 'public', RELIGION: 'church',
            'NATURE + ANIMAL': 'pets'
        };

        categories.forEach(category => {
            if (streamsData.some(s => s.category === category) || category === 'ALL') {
                const pill = document.createElement('button');
                pill.className = 'pill';
                if (category === 'ALL') pill.classList.add('active');
                pill.dataset.category = category;
                pill.innerHTML = `<span class="material-symbols-outlined">${categoryIcons[category] || 'emergency'}</span> ${category}`;
                pill.addEventListener('click', createRipple);
                pill.addEventListener('click', () => {
                    document.querySelector('.pill.active').classList.remove('active');
                    pill.classList.add('active');
                    renderChannels(category);
                });
                categoryPillsContainer.appendChild(pill);
            }
        });

        const renderChannels = (filter) => {
            channelListingsContainer.innerHTML = '';
            const filteredStreams = (filter === 'ALL') ? streamsData : streamsData.filter(s => s.category === filter);
            const groupedByCategory = filteredStreams.reduce((acc, stream) => {
                (acc[stream.category] = acc[stream.category] || []).push(stream);
                return acc;
            }, {});

            const orderedCategories = categories.filter(c => c !== 'ALL' && groupedByCategory[c]);
            
            orderedCategories.forEach(category => {
                const section = document.createElement('div');
                section.className = 'category-section';
                const title = document.createElement('div');
                title.className = 'category-title';
                title.innerHTML = `<span class="material-symbols-outlined">${categoryIcons[category] || 'emergency'}</span><h3>${category}</h3>`;
                section.appendChild(title);
                const row = document.createElement('div');
                row.className = 'channel-row';
                groupedByCategory[category].forEach(stream => {
                    const card = document.createElement('div');
                    card.className = 'channel-card';
                    const logoBg = document.createElement('div');
                    logoBg.className = 'channel-logo-bg';
                    logoBg.innerHTML = `<img src="${stream.logo}" alt="${stream.name}" class="channel-logo">`;
                    
                    logoBg.addEventListener("click", createRipple);

                    // --- URL HANDLING & HISTORY API ---
                    logoBg.addEventListener('click', (e) => {
                        e.preventDefault(); // Prevent any default link behavior
                        const channelName = encodeURIComponent(stream.name);
                        const newUrl = `/liveplay/?play=${channelName}`;
                        
                        // Change the URL in the browser bar without reloading the page
                        history.pushState({ channel: stream.name }, ``, newUrl);
                        
                        // Now open the player
                        openPlayer(stream);
                    });
                    
                    card.appendChild(logoBg);
                    row.appendChild(card);
                });
                section.appendChild(row);
                channelListingsContainer.appendChild(section);
            });
        };
        renderChannels('ALL');
    }

    // --- PLAYER LOGIC ---
    const playerView = document.getElementById('player-view');
    const minimizedPlayer = document.getElementById('minimized-player');
    const minimizeBtn = document.getElementById('minimize-player-btn');
    const exitBtn = document.getElementById('exit-player-btn');
    let activeStream = null;

    const initPlayer = async () => {
        shaka.polyfill.installAll();
        if (shaka.Player.isBrowserSupported()) {
            player = new shaka.Player(videoElement);
            ui = new shaka.ui.Overlay(player, playerWrapper, videoElement);
            ui.getControls();
            player.addEventListener('error', onError);
        } else { console.error('Browser not supported!'); }
    };

    const onError = (event) => console.error('Player Error', event.detail);

    const openPlayer = async (stream) => {
        if (!player) await initPlayer();
        activeStream = stream;
        document.getElementById('player-channel-name').textContent = stream.name;
        document.getElementById('player-channel-category').textContent = stream.category;
        document.getElementById('minimized-player-logo').src = stream.logo;
        document.getElementById('minimized-player-name').textContent = stream.name;
        document.getElementById('minimized-player-category').textContent = stream.category;
        player.configure({ drm: { clearKeys: stream.clearKey || {} } });
        try { await player.load(stream.manifestUri); videoElement.play(); } 
        catch (e) { onError(e); }
        minimizedPlayer.classList.remove('active');
        playerView.classList.add('active');
    };

    const minimizePlayer = () => {
        if (playerView.classList.contains('active')) {
            playerView.classList.remove('active');
            minimizedPlayer.classList.add('active');
        }
    };

    const restorePlayer = () => {
        if (minimizedPlayer.classList.contains('active')) {
            minimizedPlayer.classList.remove('active');
            playerView.classList.add('active');
            videoElement.play();
        }
    };

    const closePlayer = async (e) => {
        e.stopPropagation();
        playerView.classList.remove('active');
        minimizedPlayer.classList.remove('active');
        if (player) { await player.unload(); }
        activeStream = null;
        // When closing, reset the URL back to the base
        history.pushState({}, '', '/liveplay/');
    };
    
    if(minimizeBtn) minimizeBtn.addEventListener('click', minimizePlayer);
    if(minimizedPlayer) minimizedPlayer.addEventListener('click', restorePlayer);
    if(exitBtn) exitBtn.addEventListener('click', closePlayer);
    
    // --- HANDLE DIRECT PLAY FROM URL ON PAGE LOAD ---
    const params = new URLSearchParams(window.location.search);
    const channelToPlay = params.get('play');
    if (channelToPlay) {
        const streamToPlay = streamsData.find(s => s.name === decodeURIComponent(channelToPlay));
        if (streamToPlay) { openPlayer(streamToPlay); }
    }
});
