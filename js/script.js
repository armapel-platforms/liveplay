document.addEventListener('DOMContentLoaded', () => {
    const streamsData = window.streams;

    // Header interactivity
    const searchIcon = document.getElementById('search-icon');
    const menuIcon = document.getElementById('menu-icon');
    const searchPage = document.getElementById('search-page');
    const closeSearchBtn = document.getElementById('close-search');
    const menuPopup = document.getElementById('menu-popup');

    searchIcon.addEventListener('click', () => {
        searchPage.style.display = 'flex';
    });

    closeSearchBtn.addEventListener('click', () => {
        searchPage.style.display = 'none';
    });

    menuIcon.addEventListener('click', (e) => {
        e.stopPropagation();
        menuPopup.style.display = menuPopup.style.display === 'block' ? 'none' : 'block';
    });

    document.addEventListener('click', () => {
        menuPopup.style.display = 'none';
    });

    menuPopup.addEventListener('click', (e) => {
        e.stopPropagation();
    });

    // Featured Slider
    const swiper = new Swiper('.swiper', {
        loop: true,
        pagination: {
          el: '.swiper-pagination',
        },
        autoplay: {
            delay: 5000,
        },
    });

    // Categories and Channels
    const categories = ['ALL', ...new Set(streamsData.map(s => s.category))];
    const categoryPillsContainer = document.querySelector('.category-pills');
    const channelsContainer = document.getElementById('channels-container');

    const categoryIcons = {
        'GENERAL': 'public',
        'NEWS': 'feed',
        'ENTERTAINMENT': 'theater_comedy',
        'SPORTS': 'sports_basketball',
        'MOVIES': 'movie',
        'KIDS': 'child_care',
        'OVERSEAS': 'flight',
        'EDUCATIONAL': 'school',
        'RELIGION': 'church',
        'MUSIC': 'music_note',
        'ACTION + CRIME': 'local_police',
        'NATURE + ANIMAL': 'pets',
        'LIFESTYLE + FOOD': 'restaurant'
    };

    categories.forEach(category => {
        const pill = document.createElement('div');
        pill.classList.add('category-pill');
        pill.dataset.category = category;
        pill.textContent = category;
        if (category === 'ALL') {
            pill.classList.add('active');
        }
        categoryPillsContainer.appendChild(pill);
    });

    const displayChannels = (filter = 'ALL') => {
        channelsContainer.innerHTML = '';
        const categoriesToDisplay = filter === 'ALL' ? categories.slice(1) : [filter];

        categoriesToDisplay.forEach(category => {
            const categorySection = document.createElement('div');
            categorySection.classList.add('category-section');

            const categoryTitle = document.createElement('h2');
            categoryTitle.classList.add('category-title');
            categoryTitle.innerHTML = `<span class="material-symbols-outlined">${categoryIcons[category] || 'folder'}</span> ${category}`;
            categorySection.appendChild(categoryTitle);

            const channelsGrid = document.createElement('div');
            channelsGrid.classList.add('channels-grid');

            streamsData.filter(s => s.category === category).forEach(stream => {
                const channelCard = document.createElement('div');
                channelCard.classList.add('channel-card');
                channelCard.dataset.manifest = stream.manifestUri;
                channelCard.dataset.name = stream.name;
                channelCard.dataset.category = stream.category;
                channelCard.dataset.logo = stream.logo;

                channelCard.innerHTML = `
                    <div class="logo-container">
                        <img src="${stream.logo}" alt="${stream.name} logo">
                    </div>
                `;
                channelsGrid.appendChild(channelCard);
            });
            categorySection.appendChild(channelsGrid);
            channelsContainer.appendChild(categorySection);
        });
    };

    categoryPillsContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('category-pill')) {
            document.querySelectorAll('.category-pill').forEach(p => p.classList.remove('active'));
            e.target.classList.add('active');
            displayChannels(e.target.dataset.category);
        }
    });

    displayChannels();

    // Player functionality
    const playerSlideUp = document.getElementById('player-slide-up');
    const arrowDown = document.getElementById('arrow-down');
    const playerDiv = document.getElementById('player');
    const playerChannelName = document.getElementById('player-channel-name');
    const playerChannelCategory = document.getElementById('player-channel-category');
    const minimizedPlayer = document.getElementById('minimized-player');
    const closeMinimized = document.getElementById('close-minimized');

    let shakaPlayer;

    const initPlayer = (manifestUri) => {
        if (shakaPlayer) {
            shakaPlayer.destroy();
        }
        const video = document.createElement('video');
        video.id = 'video-player';
        video.poster = '';
        video.controls = true;
        video.autoplay = true;
        video.style.width = '100%';
        video.style.height = '100%';
        playerDiv.innerHTML = '';
        playerDiv.appendChild(video);

        shaka.polyfill.installAll();
        if (shaka.Player.isBrowserSupported()) {
            shakaPlayer = new shaka.Player(video);
            shakaPlayer.load(manifestUri).catch(onError);
        } else {
            console.error('Browser not supported!');
        }
    };

    function onError(error) {
        console.error('Error code', error.code, 'object', error);
    }

    channelsContainer.addEventListener('click', (e) => {
        const card = e.target.closest('.channel-card');
        if (card) {
            const { manifest, name, category, logo } = card.dataset;
            playerChannelName.textContent = name;
            playerChannelCategory.textContent = category;
            initPlayer(manifest);
            playerSlideUp.classList.add('show');

            // Update minimized player info
            document.getElementById('minimized-logo').src = logo;
            document.getElementById('minimized-name').textContent = name;
            document.getElementById('minimized-category').textContent = category;
        }
    });

    arrowDown.addEventListener('click', () => {
        playerSlideUp.classList.remove('show');
        minimizedPlayer.classList.add('show');
    });

    minimizedPlayer.addEventListener('click', (e) => {
        if (e.target.id !== 'close-minimized') {
            minimizedPlayer.classList.remove('show');
            playerSlideUp.classList.add('show');
        }
    });

    closeMinimized.addEventListener('click', () => {
        minimizedPlayer.classList.remove('show');
        if (shakaPlayer) {
            shakaPlayer.destroy();
        }
    });

    // Search functionality
    const searchInput = document.getElementById('search-input');
    const searchResults = document.getElementById('search-results');

    searchInput.addEventListener('input', () => {
        const query = searchInput.value.toLowerCase();
        searchResults.innerHTML = '';
        if (query) {
            const filtered = streamsData.filter(s => s.name.toLowerCase().includes(query));
            filtered.forEach(stream => {
                const resultItem = document.createElement('div');
                resultItem.classList.add('channel-card');
                resultItem.dataset.manifest = stream.manifestUri;
                resultItem.dataset.name = stream.name;
                resultItem.dataset.category = stream.category;
                resultItem.dataset.logo = stream.logo;
                resultItem.innerHTML = `
                    <img src="${stream.logo}" alt="${stream.name}" style="width: 50px; height: 50px; border-radius: 50%;">
                    <span>${stream.name}</span>
                `;
                searchResults.appendChild(resultItem);
            });
        }
    });

     searchResults.addEventListener('click', (e) => {
        const card = e.target.closest('.channel-card');
        if (card) {
            const { manifest, name, category, logo } = card.dataset;
            playerChannelName.textContent = name;
            playerChannelCategory.textContent = category;
            initPlayer(manifest);
            searchPage.style.display = 'none';
            playerSlideUp.classList.add('show');

            document.getElementById('minimized-logo').src = logo;
            document.getElementById('minimized-name').textContent = name;
            document.getElementById('minimized-category').textContent = category;
        }
    });

});
