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

    const staticRippleElements = document.querySelectorAll('.icon-link, #minimized-player, .back-link, .video-player-container');
    staticRippleElements.forEach(elem => elem.addEventListener("click", createRipple));

    const header = document.querySelector('header');
    const menuBtn = document.getElementById('menu-btn');
    const floatingMenu = document.getElementById('floating-menu');
    const streamsData = [...streams, ...yt_live];
    const videoElement = document.getElementById('video-player');
    const playerWrapper = document.getElementById('video-player-wrapper');
    const authPopup = document.getElementById('auth-popup-overlay');
    const closePopupBtn = document.getElementById('close-popup');
    let player = null;
    let ui = null;
    let currentUser = null;

    if (document.getElementById('featured-slider')) {
        window.addEventListener('scroll', () => {
            header.classList.toggle('scrolled', window.scrollY > 10);
        });
    }

    const renderMenu = (user) => {
        let menuContent = '';
        if (user) {
            menuContent = `
                <div class="menu-header">Hi, ${user.first_name || 'User'}</div>
                <div class="menu-divider"></div>
                <ul>
                    <li><a href="account.html"><span class="material-symbols-outlined">manage_accounts</span> Manage Account</a></li>
                </ul>`;
        } else {
            menuContent = `
                <div class="menu-header">Hi, Guest</div>
                <div class="menu-divider"></div>
                <ul>
                    <li><a href="login-signup.html"><span class="material-symbols-outlined">login</span> Log In / Sign Up</a></li>
                </ul>`;
        }
                menuContent += `
            <ul>
                <li><a href="about.html"><span class="material-symbols-outlined">info</span> About Us</a></li>
                <li><a href="faq.html"><span class="material-symbols-outlined">quiz</span> FAQ</a></li>
                <li><a href="privacy.html"><span class="material-symbols-outlined">shield</span> Privacy Policy</a></li>
                <li><a href="terms.html"><span class="material-symbols-outlined">gavel</span> Terms of Service</a></li>
            </ul>`;
        floatingMenu.innerHTML = menuContent;
        
        floatingMenu.querySelectorAll('li').forEach(li => {
            const link = li.querySelector('a');
            li.addEventListener('mousedown', () => li.classList.add('active-press'));
            li.addEventListener('touchstart', () => li.classList.add('active-press'));
            const releaseAction = (e) => {
                li.classList.remove('active-press');
                createRipple(e);
                if (link && link.href) {
                    setTimeout(() => { window.location.href = link.href; }, 150);
                }
            };
            li.addEventListener('mouseup', releaseAction);
            li.addEventListener('touchend', releaseAction);
            li.addEventListener('mouseleave', () => li.classList.remove('active-press'));
        });
    };
    
    const showAuthPopup = () => { if (!currentUser && authPopup) authPopup.classList.add('active'); };
    const hideAuthPopup = () => { if (authPopup) authPopup.classList.remove('active'); };

    currentUser = await window.auth.getCurrentUser();
    renderMenu(currentUser);

    window.auth.onAuthStateChange(user => {
        currentUser = user;
        renderMenu(currentUser);
    });

    if (authPopup) authPopup.addEventListener('click', (e) => { if (e.target === authPopup) hideAuthPopup(); });
    if (closePopupBtn) closePopupBtn.addEventListener('click', hideAuthPopup);
    
    if (menuBtn) menuBtn.addEventListener('click', (e) => { e.stopPropagation(); floatingMenu.classList.toggle('active'); });
    document.addEventListener('click', (e) => { if (floatingMenu && floatingMenu.classList.contains('active') && !floatingMenu.contains(e.target) && e.target !== menuBtn) floatingMenu.classList.remove('active'); });

    const slider = document.querySelector('.slider');
    if (slider) {
        const slides = document.querySelectorAll('.slide');
        const dots = document.querySelectorAll('.slider-nav .dot');
        let currentSlide = 0;
        const slideInterval = 5000;
        const showSlide = (index) => {
            slides.forEach((slide) => slide.classList.remove('active'));
            dots.forEach(dot => dot.classList.remove('active'));
            if (slides[index]) slides[index].classList.add('active');
            if (dots[index]) dots[index].classList.add('active');
        };
        const nextSlide = () => { currentSlide = (currentSlide + 1) % slides.length; showSlide(currentSlide); };
        dots.forEach((dot, index) => dot.addEventListener('click', () => { currentSlide = index; showSlide(currentSlide); }));
        setInterval(nextSlide, slideInterval);
    }
    
    const categoryPillsContainer = document.querySelector('.category-pills');
    const channelListingsContainer = document.getElementById('channel-listings');
    if (categoryPillsContainer && channelListingsContainer) {
        const categories = ['ALL', 'GENERAL', 'NEWS', 'ENTERTAINMENT', 'MOVIES', 'SPORTS', 'KIDS', 'EDUCATIONAL', 'LIFESTYLE + FOOD', 'MUSIC', 'ACTION + CRIME', 'OVERSEAS', 'RELIGION', 'NATURE + ANIMAL', 'YOUTUBE LIVE'];
        const categoryIcons = {
            ALL: 'apps', GENERAL: 'tv_gen', NEWS: 'newspaper', ENTERTAINMENT: 'movie',
            SPORTS: 'sports_basketball', MOVIES: 'theaters', KIDS: 'smart_toy',
            EDUCATIONAL: 'school', 'LIFESTYLE + FOOD': 'restaurant', MUSIC: 'music_note',
            'ACTION + CRIME': 'local_police', OVERSEAS: 'public', RELIGION: 'church',
            'NATURE + ANIMAL': 'pets', 'YOUTUBE LIVE': 'smart_display'
        };

        categories.forEach(category => {
            if (streamsData.some(s => s.category === category) || category === 'ALL') {
                const pill = document.createElement('button');
                pill.className = 'pill';
                if (category === 'ALL') pill.classList.add('active');
                pill.dataset.category = category;
                pill.innerHTML = `<span class="material-symbols-outlined">${categoryIcons[category] || 'emergency'}</span>`;
                pill.addEventListener('click', createRipple);
                pill.addEventListener('click', () => {
                    const currentActive = document.querySelector('.pill.active');
                    if (currentActive) {
                        currentActive.classList.remove('active');
                    }
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
                    logoBg.addEventListener('click', (e) => {
                        e.preventDefault();
                        if (currentUser) {
                            const channelName = encodeURIComponent(stream.name.replace(/\s+/g, '-'));
                            history.pushState({ channel: stream.name }, ``, `?play=${channelName}`);
                            openPlayer(stream);
                        } else {
                            showAuthPopup();
                        }
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
        const videoPlayer = document.getElementById('video-player');
        const youtubePlayer = document.getElementById('youtube-player');

        if (stream.type === 'youtube') {
            if (player) {
                await player.unload();
            }
            // --- FINAL FIX: Use the official API to disable the Shaka UI ---
            if (ui) {
                ui.setEnabled(false);
            }
            videoPlayer.style.display = 'none';
            youtubePlayer.src = stream.embedUrl;
            youtubePlayer.style.display = 'block';
        } else { // This block handles Shaka Player streams
            youtubePlayer.style.display = 'none';
            youtubePlayer.src = '';
            videoPlayer.style.display = 'block';
            
            if (!player) {
                await initPlayer();
            }
            
            // --- FINAL FIX: Ensure the Shaka UI is enabled for Shaka streams ---
            if (ui) {
                ui.setEnabled(true);
            }

            player.configure({ drm: { clearKeys: stream.clearKey || {} } });
            try { 
                await player.load(stream.manifestUri); 
                videoElement.play(); 
            } catch (e) { onError(e); }
        }

        activeStream = stream;
        document.getElementById('player-channel-name').textContent = stream.name;
        document.getElementById('player-channel-category').textContent = stream.category;
        document.getElementById('minimized-player-logo').src = stream.logo;
        document.getElementById('minimized-player-name').textContent = stream.name;
        document.getElementById('minimized-player-category').textContent = stream.category;
        
        minimizedPlayer.classList.remove('active');
        playerView.classList.add('active');
    };

    const minimizePlayer = () => {
        if (playerView.classList.contains('active')) {
            playerView.classList.remove('active');
            minimizedPlayer.classList.add('active');
        }
    };

    const restorePlayer = (e) => {
        if (e.target.closest('#exit-player-btn')) return;
        if (minimizedPlayer.classList.contains('active')) {
            minimizedPlayer.classList.remove('active');
            playerView.classList.add('active');
            if (activeStream && activeStream.type !== 'youtube') {
                 videoElement.play();
            }
        }
    };

    const closePlayer = async (e) => {
        e.stopPropagation();
        playerView.classList.remove('active');
        minimizedPlayer.classList.remove('active');

        const youtubePlayer = document.getElementById('youtube-player');
        if (youtubePlayer) {
            youtubePlayer.src = '';
            youtubePlayer.style.display = 'none';
        }
        document.getElementById('video-player').style.display = 'block';

        // --- FINAL FIX: Also disable UI on close to be safe ---
        if (ui) {
            ui.setEnabled(false);
        }

        if (player) { 
            await player.unload(); 
        }
        activeStream = null;
        history.pushState({}, '', window.location.pathname);
    };
    
    if(minimizeBtn) minimizeBtn.addEventListener('click', minimizePlayer);
    if(minimizedPlayer) minimizedPlayer.addEventListener('click', restorePlayer);
    if(exitBtn) exitBtn.addEventListener('click', closePlayer);
    
    const params = new URLSearchParams(window.location.search);
    const channelToPlay = params.get('play');
    if (channelToPlay) {
         if (currentUser) {
            const streamToPlay = streamsData.find(s => s.name.replace(/\s+/g, '-') === channelToPlay);
            if (streamToPlay) openPlayer(streamToPlay);
        } else {
            history.replaceState({}, '', window.location.pathname); 
            showAuthPopup();
        }
    }
});
