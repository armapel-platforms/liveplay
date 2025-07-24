document.addEventListener('DOMContentLoaded', function() {
    const menuIcon = document.getElementById('menu-icon');
    const menuContainer = document.getElementById('menu-container');
    const channelsContainer = document.getElementById('channels-container');
    const slideUpPlayer = document.getElementById('slide-up-player');
    const minimizePlayer = document.getElementById('minimize-player');
    const minimizedPlayer = document.getElementById('minimized-player');
    const exitMinimized = document.getElementById('exit-minimized');
    const video = document.getElementById('video');
    const featuredSlider = document.querySelector('.featured-slider');
    const dotsContainer = document.querySelector('.dots');
    const categoryPillsContainer = document.querySelector('.category-pills');
    let shakaPlayer;
    let hls;

    // Menu toggle
    menuIcon.addEventListener('click', () => {
        menuContainer.classList.toggle('active');
    });

    const featuredContent = [
        { type: 'show', channelLogo: 'https://static.wikia.nocookie.net/abscbn/images/7/74/Kapamilya_Channel_3D_Logo.png', title: 'FPJ\'s Batang Quiapo', badge: 'CATCH-UP TV'},
        { type: 'promo', title: 'Stream Anywhere, Anytime!', badge: 'VISIT'},
        // Add more featured content here
    ];

    let currentSlide = 0;

    function createSlider() {
        featuredSlider.innerHTML = '';
        dotsContainer.innerHTML = '';
        featuredContent.forEach((content, index) => {
            const slide = document.createElement('div');
            slide.classList.add('slide');
            if (index === 0) slide.classList.add('active');

            const contentDiv = document.createElement('div');
            contentDiv.classList.add('slide-content');

            if (content.type === 'show') {
                const logo = document.createElement('img');
                logo.src = content.channelLogo;
                contentDiv.appendChild(logo);
            }
            const title = document.createElement('h2');
            title.textContent = content.title;
            const badge = document.createElement('span');
            badge.classList.add('badge');
            badge.textContent = content.badge;

            contentDiv.appendChild(title);
            contentDiv.appendChild(badge);
            slide.appendChild(contentDiv);
            featuredSlider.appendChild(slide);

            const dot = document.createElement('span');
            dot.classList.add('dot');
            if (index === 0) dot.classList.add('active');
            dot.addEventListener('click', () => {
                currentSlide = index;
                updateSlider();
            });
            dotsContainer.appendChild(dot);
        });
    }

    function updateSlider() {
        const slides = document.querySelectorAll('.slide');
        const dots = document.querySelectorAll('.dot');
        slides.forEach((slide, index) => {
            slide.classList.toggle('active', index === currentSlide);
        });
        dots.forEach((dot, index) => {
            dot.classList.toggle('active', index === currentSlide);
        });
    }

    setInterval(() => {
        currentSlide = (currentSlide + 1) % featuredContent.length;
        updateSlider();
    }, 5000);


    // Create categories
    const categories = ['ALL', ...new Set(streams.map(stream => stream.category))];
    const categoryIcons = {
        'ALL': 'apps',
        'GENERAL': 'public',
        'NEWS': 'feed',
        'ENTERTAINMENT': 'movie',
        'SPORTS': 'sports_basketball',
        'MOVIES': 'theaters',
        'KIDS': 'child_care',
        'OVERSEAS': 'flight',
        'EDUCATIONAL': 'school',
        'RELIGION': 'self_improvement',
        'ACTION + CRIME': 'local_police',
        'NATURE + ANIMAL': 'pets',
        'LIFESTYLE + FOOD': 'restaurant',
        'MUSIC': 'music_note'
    };


    categories.forEach(category => {
        const pill = document.createElement('div');
        pill.classList.add('category-pill');
        if (category === 'ALL') pill.classList.add('active');
        pill.dataset.category = category;
        const icon = document.createElement('i');
        icon.classList.add('material-icons');
        icon.textContent = categoryIcons[category] || 'live_tv';
        pill.appendChild(icon);
        pill.append(category);
        pill.addEventListener('click', () => {
            document.querySelector('.category-pill.active').classList.remove('active');
            pill.classList.add('active');
            loadChannels(category);
        });
        categoryPillsContainer.appendChild(pill);
    });

    // Load channels
    function loadChannels(filter = 'ALL') {
        channelsContainer.innerHTML = '';
        const filteredStreams = filter === 'ALL' ? streams : streams.filter(stream => stream.category === filter);

        const categorizedStreams = filteredStreams.reduce((acc, stream) => {
            (acc[stream.category] = acc[stream.category] || []).push(stream);
            return acc;
        }, {});


        for (const category in categorizedStreams) {
            const categorySection = document.createElement('div');
            categorySection.classList.add('category-section');

            const categoryTitle = document.createElement('div');
            categoryTitle.classList.add('category-title');
            const icon = document.createElement('i');
            icon.classList.add('material-icons');
            icon.textContent = categoryIcons[category] || 'live_tv';
            categoryTitle.appendChild(icon);
            categoryTitle.append(category);
            categorySection.appendChild(categoryTitle);

            const channelsGrid = document.createElement('div');
            channelsGrid.classList.add('channels-grid');


            categorizedStreams[category].forEach(stream => {
                const channelCard = document.createElement('div');
                channelCard.classList.add('channel-card');
                const logo = document.createElement('img');
                logo.src = stream.logo;
                channelCard.appendChild(logo);
                channelCard.addEventListener('click', () => openPlayer(stream));
                channelsGrid.appendChild(channelCard);
            });
            categorySection.appendChild(channelsGrid);
            channelsContainer.appendChild(categorySection);
        }
    }


    // Player functionality
    async function openPlayer(stream) {
        slideUpPlayer.classList.add('active');
        document.getElementById('player-channel-name').textContent = stream.name;
        document.getElementById('player-channel-category').textContent = stream.category;

        if (shakaPlayer) {
            await shakaPlayer.destroy();
        }
        if (hls) {
            hls.destroy();
        }

        if (stream.type === 'mpegdash') {
            shaka.polyfill.installAll();
            if (shaka.Player.isBrowserSupported()) {
                shakaPlayer = new shaka.Player(video);
                const ui = new shaka.ui.Overlay(shakaPlayer, document.querySelector('.slide-up-player'), video);
                ui.getControls();
                shakaPlayer.configure({
                    drm: {
                        clearKeys: stream.clearKey
                    }
                });
                try {
                    await shakaPlayer.load(stream.manifestUri);
                } catch (e) {
                    console.error('Error code', e.code, 'object', e);
                }
            } else {
                console.error('Browser not supported!');
            }
        } else if (stream.type === 'hls') {
            if (Hls.isSupported()) {
                hls = new Hls();
                hls.loadSource(stream.manifestUri);
                hls.attachMedia(video);
            } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
                video.src = stream.manifestUri;
            }
        }

        document.getElementById('minimized-logo').src = stream.logo;
        document.getElementById('minimized-channel-name').textContent = stream.name;
        document.getElementById('minimized-channel-category').textContent = stream.category;

    }

    minimizePlayer.addEventListener('click', () => {
        slideUpPlayer.classList.remove('active');
        minimizedPlayer.classList.add('active');
    });

    minimizedPlayer.addEventListener('click', (e) => {
        if (e.target.id !== 'exit-minimized') {
            slideUpPlayer.classList.add('active');
            minimizedPlayer.classList.remove('active');
        }
    });

    exitMinimized.addEventListener('click', async () => {
        minimizedPlayer.classList.remove('active');
        if (shakaPlayer) {
            await shakaPlayer.destroy();
        }
        if (hls) {
            hls.destroy();
        }
        video.src = '';
    });

    createSlider();
    loadChannels();
});
