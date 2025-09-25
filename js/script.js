document.addEventListener('DOMContentLoaded', async () => {
    debugger;

    const createRipple = (event) => {
        debugger;
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
        if (ripple) {
            debugger;
            ripple.remove();
        }
        target.appendChild(circle);
    };

    const staticRippleElements = document.querySelectorAll('.icon-link, #minimized-player, .back-link');
    staticRippleElements.forEach(elem => elem.addEventListener("click", createRipple));

    const header = document.querySelector('header');
    const menuBtn = document.getElementById('menu-btn');
    const floatingMenu = document.getElementById('floating-menu');
    let streamsData = [];
    const videoElement = document.getElementById('video-player');
    const playerWrapper = document.getElementById('video-player-wrapper');
    const authPopup = document.getElementById('auth-popup-overlay');
    const closePopupBtn = document.getElementById('close-popup');
    let player = null;
    let ui = null;
    let currentUser = null;

    const playerView = document.getElementById('player-view');
    const minimizedPlayer = document.getElementById('minimized-player');
    const minimizeBtn = document.getElementById('minimize-player-btn');
    const exitBtn = document.getElementById('exit-player-btn');
    let activeStream = null;

    const originalTitle = "Liveplay - Free Live Philippine TV Channels Online";

    const isDesktop = () => window.innerWidth >= 1024;

    const setVideoPoster = () => {
        debugger;
        if (!videoElement) return;
        if (isDesktop()) {
            videoElement.poster = '/logo/desktop-poster.png';
        } else {
            videoElement.poster = '/logo/attention.png';
        }
    };

    const setupLayout = () => {
        debugger;
        if (isDesktop()) {
            if (playerView) playerView.classList.add('active');
            if (minimizeBtn) minimizeBtn.style.display = 'none';
            if (minimizedPlayer) minimizedPlayer.classList.remove('active');

        } else {
            if (minimizeBtn) minimizeBtn.style.display = 'flex';
            if (!activeStream && playerView) {
                playerView.classList.remove('active');
            }
        }
    };

    setVideoPoster();
    setupLayout();
    window.addEventListener('resize', () => {
        setVideoPoster();
        setupLayout();
    });

    if (document.getElementById('featured-slider')) {
        window.addEventListener('scroll', () => {
            header.classList.toggle('scrolled', window.scrollY > 10);
        });
    }

    const renderMenu = (user) => {
        debugger;
        let menuContent = '';
        if (user) {
            menuContent = `
                <div class="menu-header">Hi, ${user.first_name || 'User'}</div>
                <div class="menu-divider"></div>
                <ul>
                    <li><a href="/home/my-account"><span class="material-symbols-outlined">manage_accounts</span> My Account</a></li>
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
                    createRipple(e);
                    if (link && link.href) {
                        setTimeout(() => {
                            window.location.href = link.href;
                        }, 150);
                    }
                };
                li.addEventListener('mouseup', releaseAction);
                li.addEventListener('touchend', releaseAction);
                li.addEventListener('mouseleave', () => li.classList.remove('active-press'));
            });
        }
    };

    const showAuthPopup = () => {
        debugger;
        if (!currentUser && authPopup) authPopup.classList.add('active');
    };
    const hideAuthPopup = () => {
        if (authPopup) authPopup.classList.remove('active');
    };

    currentUser = await window.auth.getCurrentUser();
    renderMenu(currentUser);

    window.auth.onAuthStateChange(async (_event, session) => {
        debugger;
        if (session) {
            currentUser = await window.auth.getCurrentUser();
        } else {
            currentUser = null;
        }
        renderMenu(currentUser);
    });
    if (authPopup) authPopup.addEventListener('click', (e) => {
        if (e.target === authPopup) hideAuthPopup();
    });
    if (closePopupBtn) closePopupBtn.addEventListener('click', hideAuthPopup);

    const popupActionBtn = document.querySelector('.popup-action-btn');
    if (popupActionBtn) {
        popupActionBtn.addEventListener('click', (e) => {
            e.preventDefault();

            popupActionBtn.classList.add('clicked');
            const destination = popupActionBtn.href;

            setTimeout(() => {
                window.location.href = destination;
            }, 200);
        });
    }

    if (menuBtn) menuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (floatingMenu) floatingMenu.classList.toggle('active');
    });
    document.addEventListener('click', (e) => {
        if (floatingMenu && floatingMenu.classList.contains('active') && !floatingMenu.contains(e.target) && e.target !== menuBtn) floatingMenu.classList.remove('active');
    });

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
        const nextSlide = () => {
            currentSlide = (currentSlide + 1) % slides.length;
            showSlide(currentSlide);
        };
        dots.forEach((dot, index) => dot.addEventListener('click', () => {
            currentSlide = index;
            showSlide(currentSlide);
        }));
        setInterval(nextSlide, slideInterval);
    }

    const categoryPillsContainer = document.querySelector('.category-pills');
    const channelListingsContainer = document.getElementById('channel-listings');

    const renderChannels = (filter) => {
        debugger;
        if (!channelListingsContainer) return;
        channelListingsContainer.innerHTML = '';
        const filteredStreams = (filter === 'ALL') ? streamsData : streamsData.filter(s => s.category === filter);
        const groupedByCategory = filteredStreams.reduce((acc, stream) => {
            (acc[stream.category] = acc[stream.category] || []).push(stream);
            return acc;
        }, {});

        const categories = ['ALL', 'General', 'News', 'Entertainment', 'Movies', 'Sports', 'Kids', 'Infotainment', 'Lifestyle + Food', 'Music', 'Action + Crime', 'Nature + Animal', 'Overseas', 'Religious', 'YouTube Live'];
        const categoryIcons = {
            ALL: 'apps',
            General: 'tv_gen',
            News: 'news',
            Entertainment: 'theater_comedy',
            Movies: 'theaters',
            Sports: 'sports_basketball',
            Kids: 'smart_toy',
            Infotainment: 'emoji_objects',
            'Lifestyle + Food': 'restaurant',
            Music: 'music_note',
            'Action + Crime': 'local_police',
            'Nature + Animal': 'pets',
            Overseas: 'globe',
            Religious: 'church',
            'YouTube Live': 'smart_display'
        };

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
                    debugger;
                    e.preventDefault();
                    if (currentUser) {
                        const channelName = encodeURIComponent(stream.name.replace(/\s+/g, '-'));
                        history.pushState({
                            channel: stream.name
                        }, ``, `/home?play=${channelName}`);
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

    async function initializePage() {
        debugger;
        try {
            const response = await fetch('/api/getChannels');
            if (!response.ok) throw new Error('Network response was not ok');
            const publicStreams = await response.json();
            streamsData = [...publicStreams, ...yt_live];
        } catch (error) {
            console.error("Failed to fetch channel list:", error);
            streamsData = [...yt_live];
        }

        if (categoryPillsContainer && channelListingsContainer) {
            const categories = ['ALL', ...new Set(streamsData.map(s => s.category))];
            const categoryIcons = {
                ALL: 'apps',
                General: 'tv_gen',
                News: 'news',
                Entertainment: 'theater_comedy',
                Movies: 'theaters',
                Sports: 'sports_basketball',
                Kids: 'smart_toy',
                Infotainment: 'emoji_objects',
                'Lifestyle + Food': 'restaurant',
                Music: 'music_note',
                'Action + Crime': 'local_police',
                'Nature + Animal': 'pets',
                Overseas: 'globe',
                Religious: 'church',
                'YouTube Live': 'smart_display'
            };

            categoryPillsContainer.innerHTML = '';
            categories.forEach(category => {
                const pill = document.createElement('button');
                pill.className = 'pill';
                if (category === 'ALL') pill.classList.add('active');
                pill.dataset.category = category;
                pill.innerHTML = `<span class="material-symbols-outlined">${categoryIcons[category] || 'emergency'}</span>`;
                pill.addEventListener('click', createRipple);
                pill.addEventListener('click', () => {
                    document.querySelector('.pill.active')?.classList.remove('active');
                    pill.classList.add('active');
                    renderChannels(category);
                });
                categoryPillsContainer.appendChild(pill);
            });
            renderChannels('ALL');
        }

        const params = new URLSearchParams(window.location.search);
        const channelToPlay = params.get('play');
        if (channelToPlay) {
            debugger;
            if (currentUser) {
                const streamToPlay = streamsData.find(s => s.name.replace(/\s+/g, '-') === channelToPlay);
                if (streamToPlay) {
                    openPlayer(streamToPlay);
                }
            } else {
                history.replaceState({}, '', '/home');
                showAuthPopup();
            }
        }
    }

    const initPlayer = async () => {
        shaka.polyfill.installAll();
    
        if (shaka.Player.isBrowserSupported()) {
            player = new shaka.Player();
            await player.attach(videoElement);
    
            ui = new shaka.ui.Overlay(player, playerWrapper, videoElement);
            
            ui.configure({
                addSeekBar: false,
    
                'controlPanelElements': [
                    'play_pause',
                    'time_and_duration',
                    'mute',
                    'volume',
                    'fullscreen',
                    'picture_in_picture',
                    'overflow_menu'
                ]
            });
    
            player.addEventListener('error', onError);
        } else {
            console.error('Browser not supported!');
        }
    };
    
    const onError = (event) => {
        debugger;
        console.error('Player Error', event.detail);
    }

    const openPlayer = async (stream) => {
        debugger;
        const youtubePlayer = document.getElementById('youtube-player');
        activeStream = stream;

        if (stream.type === 'youtube') {
            if (player) await player.unload();
            if (ui) ui.setEnabled(false);
            if (videoElement) videoElement.style.display = 'none';
            if (youtubePlayer) {
                youtubePlayer.src = stream.embedUrl;
                youtubePlayer.style.display = 'block';
            }
        } else {
            if (youtubePlayer) {
                youtubePlayer.style.display = 'none';
                youtubePlayer.src = '';
            }
            if (videoElement) videoElement.style.display = 'block';

            if (!player) await initPlayer();
            if (ui) ui.setEnabled(true);

            try {
                debugger;
                const response = await fetch(`/api/getStream?name=${encodeURIComponent(stream.name)}`);
                if (!response.ok) throw new Error(`Stream data not found for ${stream.name}.`);
                const secureData = await response.json();

                player.configure({
                    drm: {
                        clearKeys: secureData.clearKey || {}
                    }
                });
                await player.load(secureData.manifestUri);
                videoElement.play();
            } catch (e) {
                console.error('Player Error', e);
                onError(e);
            }
        }
        document.getElementById('player-channel-name').textContent = stream.name;
        document.getElementById('player-channel-category').textContent = stream.category;

        document.title = `${stream.name} - Liveplay`;

        if (!isDesktop()) {
            document.getElementById('minimized-player-logo').src = stream.logo;
            document.getElementById('minimized-player-name').textContent = stream.name;
            document.getElementById('minimized-player-category').textContent = stream.category;
            if (minimizedPlayer) minimizedPlayer.classList.remove('active');
            if (playerView) playerView.classList.add('active');
        }
    };

    const minimizePlayer = () => {
        debugger;
        if (isDesktop()) return;
        if (playerView && playerView.classList.contains('active')) {
            playerView.classList.remove('active');
            setTimeout(() => {
                if (minimizedPlayer) minimizedPlayer.classList.add('active');
            }, 250);
        }
    };

    const restorePlayer = (e) => {
        debugger;
        if (isDesktop() || e.target.closest('#exit-player-btn')) return;
        if (minimizedPlayer && minimizedPlayer.classList.contains('active')) {
            minimizedPlayer.classList.remove('active');
            if (playerView) playerView.classList.add('active');
            if (activeStream && activeStream.type !== 'youtube') {
                if (videoElement) videoElement.play();
            }
        }
    };

    const closePlayer = async (e) => {
        debugger;
        e.stopPropagation();

        const youtubePlayer = document.getElementById('youtube-player');
        if (youtubePlayer) {
            youtubePlayer.src = '';
            youtubePlayer.style.display = 'none';
        }
        if (videoElement) videoElement.style.display = 'block';
        if (ui) ui.setEnabled(false);
        if (player) {
            await player.unload();
            setVideoPoster();
        }
        activeStream = null;
        history.pushState({}, '', '/home');

        document.title = originalTitle;

        if (isDesktop()) {
            document.getElementById('player-channel-name').textContent = 'Channel Name';
            document.getElementById('player-channel-category').textContent = 'Category';
        } else {
            if (playerView) playerView.classList.remove('active');
            if (minimizedPlayer) minimizedPlayer.classList.remove('active');
        }
    };

    if (minimizeBtn) minimizeBtn.addEventListener('click', minimizePlayer);
    if (minimizedPlayer) minimizedPlayer.addEventListener('click', restorePlayer);
    if (exitBtn) exitBtn.addEventListener('click', closePlayer);

    await initializePage();
    debugger;
});
