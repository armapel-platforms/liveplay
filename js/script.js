document.addEventListener('DOMContentLoaded', () => {

    const allSelectors = {
        header: document.querySelector("header"),
        menuBtn: document.getElementById("menu-btn"),
        floatingMenu: document.getElementById("floating-menu"),
        countryPicker: document.getElementById("country-picker"),
        countryPickerSelection: document.getElementById("country-picker-selection"),
        countryListPopup: document.getElementById("country-list-popup"),
        channelListingsContainer: document.getElementById("channel-listings"),
        spinner: document.getElementById("spinner"),
        videoElement: document.getElementById("video-player"),
        playerWrapper: document.getElementById("video-player-wrapper"),
        playerView: document.getElementById("player-view"),
        minimizedPlayer: document.getElementById("minimized-player"),
        minimizeBtn: document.getElementById("minimize-player-btn"),
        exitBtn: document.getElementById("exit-player-btn"),
        categoryPillsContainer: document.querySelector(".category-pills"),
        channelListHeader: document.getElementById("channel-list-header"),
        loadMoreContainer: document.getElementById("load-more-container"),
        loadMoreBtn: document.getElementById("load-more-btn")
    };

    let player = null, ui = null;
    const CHANNELS_PER_PAGE = 50;
    let currentlyDisplayedCount = 0;
    let currentFilteredStreams = [];
    let allStreams = [];
    let allCountries = [];
    let allApiChannels = [];
    let currentFilters = { category: "All", country: "Global" };
    const isDesktop = () => window.innerWidth >= 1024;

    const setVideoPoster = () => {
        if (!allSelectors.videoElement) return;
        if (isDesktop()) {
            allSelectors.videoElement.poster = '/logo/desktop-poster.png';
        } else {
            allSelectors.videoElement.poster = '/logo/attention.png';
        }
    };

    async function fetchApiData() {
        const CHANNELS_API_URL = "https://iptv-org.github.io/api/channels.json";
        const COUNTRIES_API_URL = "https://iptv-org.github.io/api/countries.json";
        try {
            console.log("Fetching API data...");
            const [channelsResponse, countriesResponse] = await Promise.all([
                fetch(CHANNELS_API_URL),
                fetch(COUNTRIES_API_URL)
            ]);
            if (!channelsResponse.ok || !countriesResponse.ok) throw new Error('API fetch failed.');
            allApiChannels = await channelsResponse.json();
            allCountries = await countriesResponse.json();
            console.log("API data fetched successfully.");
        } catch (error) {
            console.error("Failed to fetch API data:", error);
        }
    }

    async function fetchAndProcessM3U() {
        const M3U_URL = "https://iptv-org.github.io/iptv/index.m3u";
        allSelectors.spinner.style.display = 'flex';
        console.log("Fetching M3U file...");
        try {
            const response = await fetch(M3U_URL);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const m3uText = await response.text();
            console.log("Parsing and merging M3U data...");

            const lines = m3uText.trim().split('\n');
            const parsedStreams = [];
            const apiChannelsMap = new Map(allApiChannels.map(c => [c.id, c]));
            const countriesMap = new Map(allCountries.map(c => [c.code, c]));

            for (let i = 0; i < lines.length; i++) {
                if (lines[i].startsWith('#EXTINF:')) {
                    const infoLine = lines[i];
                    const urlLine = lines[i + 1];

                    if (urlLine && urlLine.startsWith('http')) {
                        const name = infoLine.split(',').pop()?.trim() || 'Unknown';
                        const logoMatch = infoLine.match(/tvg-logo="([^"]*)"/);
                        const categoryMatch = infoLine.match(/group-title="([^"]*)"/);
                        const idMatch = infoLine.match(/tvg-id="([^"]*)"/);
                        let channelId = idMatch ? idMatch[1] : null;

                        if (channelId && channelId.includes('@')) {
                            channelId = channelId.split('@')[0];
                        }

                        const category = categoryMatch ? categoryMatch[1].split(';')[0] : 'General';
                        
                        const apiChannel = channelId ? apiChannelsMap.get(channelId) : null;
                        const countryCode = apiChannel ? apiChannel.country : 'XX';
                        const countryInfo = countriesMap.get(countryCode);

                        parsedStreams.push({
                            name,
                            logo: logoMatch ? logoMatch[1] : '/logo/favicon.svg',
                            manifestUri: urlLine.trim(),
                            category,
                            country: countryCode,
                            countryName: countryInfo ? countryInfo.name : 'Unknown'
                        });
                    }
                }
            }
            console.log(`Parsing complete. Found ${parsedStreams.length} channels.`);
            allSelectors.spinner.style.display = 'none';
            return parsedStreams;
        } catch (error) {
            console.error("Failed to process M3U file:", error);
            allSelectors.spinner.style.display = 'none';
            allSelectors.channelListingsContainer.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 50px 0;">Could not load channels.</p>';
            return [];
        }
    }

    const getFlagUrl = (countryCode) => {
        return `/logo/flags/${countryCode.toLowerCase()}.svg`;
    };

    const renderCountryList = () => {
        const uniqueCountries = [...new Map(allStreams.filter(s => s.country && s.country !== 'XX').map(item => [item['country'], item])).values()];
        uniqueCountries.sort((a, b) => a.countryName.localeCompare(b.countryName));

        let countryListHTML = `<a href="#" data-country="Global" class="active"><span class="material-symbols-outlined">public</span><span>Global</span></a>`;
        uniqueCountries.forEach(country => {
            const flagUrl = getFlagUrl(country.country);
            countryListHTML += `<a href="#" data-country="${country.country}">
                                  <img src="${flagUrl}" alt="${country.countryName}" class="flag">
                                  <span>${country.countryName}</span>
                                </a>`;
        });
        allSelectors.countryListPopup.innerHTML = countryListHTML;

        allSelectors.countryListPopup.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const selectedCountryCode = link.dataset.country;

                allSelectors.countryListPopup.querySelector('a.active')?.classList.remove('active');
                link.classList.add('active');

                const pickerSelection = allSelectors.countryPickerSelection;
                const arrow = `<span id="country-picker-arrow" class="material-symbols-outlined">expand_more</span>`;
                if (selectedCountryCode === 'Global') {
                    pickerSelection.innerHTML = `<span class="material-symbols-outlined">public</span><span id="country-display">Global</span>` + arrow;
                } else {
                    const selectedCountry = uniqueCountries.find(c => c.country === selectedCountryCode);
                    const flagUrl = getFlagUrl(selectedCountry.country);
                    pickerSelection.innerHTML = `<img src="${flagUrl}" alt="${selectedCountry.countryName}" class="flag"><span id="country-display">${selectedCountry.countryName}</span>` + arrow;
                }

                currentFilters.country = selectedCountryCode;
                applyFiltersAndRender();
                allSelectors.countryListPopup.classList.remove('active');
            });
        });
    };
    
    const renderCategoryPills = () => {
        const iconMap = { "News": "news", "Sports": "sports_basketball", "Kids": "smart_toy", "Music": "music_note", "Movies": "theaters", "Entertainment": "theater_comedy", "Lifestyle": "restaurant", "General": "tv_gen", "Auto": "directions_car", "Animation": "person_pin", "Business": "business_center", "Classic": "history", "Comedy": "comedy_mask", "Cooking": "cooking", "Culture": "palette", "Documentary": "menu_book", "Education": "emoji_objects", "Family": "family_home", "Legislative": "gavel", "Outdoor": "hiking", "Public": "globe", "Relax": "self_improvement", "Religious": "church", "Series": "video_library", "Science": "science", "Shop": "shopping_cart", "Travel": "flight", "Weather": "thunderstorm", "Undefined": "help" };
        const defaultIcon = "apps";
        const orderedPrefix = ["General", "News", "Entertainment", "Movies", "Sports", "Kids", "Education"];
        const allDataCategories = [...new Set(allStreams.map(s => s.category))];
        const otherCategories = allDataCategories.filter(cat => !orderedPrefix.includes(cat));
        const hasUndefined = otherCategories.includes("Undefined");
        const sortedOtherCategories = otherCategories.filter(cat => cat !== "Undefined").sort();
        let finalCategoryOrder = ["All", ...orderedPrefix, ...sortedOtherCategories];
        if (hasUndefined) finalCategoryOrder.push("Undefined");

        allSelectors.categoryPillsContainer.innerHTML = "";
        finalCategoryOrder.forEach(categoryName => {
            if (categoryName === "All" || allDataCategories.includes(categoryName)) {
                const button = document.createElement("button");
                button.className = "pill";
                button.dataset.category = categoryName;
                if (categoryName === "All") button.classList.add("active");
                const iconName = (categoryName === "All") ? "apps" : (iconMap[categoryName] || defaultIcon);
                button.innerHTML = `<span class="material-symbols-outlined">${iconName}</span>`;
                button.addEventListener("click", () => {
                    allSelectors.categoryPillsContainer.querySelector(".pill.active")?.classList.remove("active");
                    button.classList.add("active");
                    currentFilters.category = categoryName;
                    applyFiltersAndRender();
                });
                allSelectors.categoryPillsContainer.appendChild(button);
            }
        });
    };

    const renderMenu = () => {
        allSelectors.floatingMenu.innerHTML = `
        <ul>
            <li><a href="/home/about-us"><span class="material-symbols-outlined">info</span> About Us</a></li>
            <li><a href="/home/faq"><span class="material-symbols-outlined">quiz</span> FAQ</a></li>
            <li><a href="/home/privacy-policy"><span class="material-symbols-outlined">shield</span> Privacy Policy</a></li>
            <li><a href="/home/terms-of-service"><span class="material-symbols-outlined">gavel</span> Terms of Service</a></li>
        </ul>`;

        allSelectors.floatingMenu.querySelectorAll("li").forEach(e => e.addEventListener("click", t => {
            const n = e.querySelector("a");
            if (n) { t.preventDefault(); window.location.href = n.href; }
        }));
    };

    const applyFiltersAndRender = () => {
        let filtered = [...allStreams];
        if (currentFilters.category !== 'All') {
            filtered = filtered.filter(stream => stream.category === currentFilters.category);
        }
        if (currentFilters.country !== 'Global') {
            filtered = filtered.filter(stream => stream.country === currentFilters.country);
        }
        currentFilteredStreams = filtered;

        const listContainer = allSelectors.channelListingsContainer;
        listContainer.innerHTML = '';
        const listElement = document.createElement('div');
        listElement.className = 'channel-list';
        listContainer.appendChild(listElement);

        let headerText = `${currentFilters.category} Channels`;
        if (currentFilters.country !== 'Global') {
            const countryData = allCountries.find(c => c.code === currentFilters.country);
            headerText += ` in ${countryData ? countryData.name : currentFilters.country}`;
        }
        allSelectors.channelListHeader.textContent = headerText;
        currentlyDisplayedCount = 0;
        loadMoreChannels();
    };

    const loadMoreChannels = () => {
        allSelectors.spinner.style.display = 'flex';
        allSelectors.loadMoreContainer.style.display = 'none';

        setTimeout(() => {
            const listElement = allSelectors.channelListingsContainer.querySelector('.channel-list');
            if (!listElement) return;

            const channelsToRender = currentFilteredStreams.slice(currentlyDisplayedCount, currentlyDisplayedCount + CHANNELS_PER_PAGE);

            channelsToRender.forEach(stream => {
                const item = document.createElement('div');
                item.className = 'channel-list-item';
                
                const liveSensorIcon = `<span class="material-symbols-outlined">sensors</span>`;

                item.innerHTML = `
                    <div class="channel-info-left">
                        <img src="${stream.logo}" alt="${stream.name} Logo" class="channel-logo" onerror="this.src='/logo/favicon.svg';">
                        <span class="channel-name">${stream.name}</span>
                    </div>
                    <div class="channel-info-right">
                        ${liveSensorIcon}
                    </div>`;
                item.addEventListener('click', () => openPlayer(stream));
                listElement.appendChild(item);
            });

            currentlyDisplayedCount += channelsToRender.length;
            allSelectors.loadMoreContainer.style.display = currentlyDisplayedCount < currentFilteredStreams.length ? 'block' : 'none';
            allSelectors.spinner.style.display = 'none';

            if (listElement.children.length === 0) {
                allSelectors.channelListingsContainer.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 50px 0;">No channels match filters.</p>';
            }
        }, 200);
    };

    const setupHeaderScroll = () => { window.addEventListener("scroll", () => allSelectors.header.classList.toggle("scrolled", window.scrollY > 10)); };

    const setupMenuInteractions = () => {
        allSelectors.menuBtn.addEventListener("click", e => { e.stopPropagation(); allSelectors.floatingMenu.classList.toggle("active"); });
        document.addEventListener("click", () => allSelectors.floatingMenu.classList.remove("active"));
        allSelectors.floatingMenu.addEventListener("click", e => e.stopPropagation());
    };

    const setupCountryPicker = () => {
        allSelectors.countryPicker.addEventListener('click', (e) => {
            e.stopPropagation();
            const isActive = allSelectors.countryListPopup.classList.toggle('active');
            const arrow = allSelectors.countryPicker.querySelector('#country-picker-arrow');
            if (arrow) arrow.classList.toggle('up', isActive);
        });
        document.addEventListener("click", () => {
            allSelectors.countryListPopup.classList.remove('active');
            const arrow = allSelectors.countryPicker.querySelector('#country-picker-arrow');
            if (arrow) arrow.classList.remove('up');
        });
    };

    const setupSlider = () => {
        const slider = document.querySelector(".slider");
        if (!slider) return;
        const slides = slider.querySelectorAll(".slide");
        const dots = slider.parentElement.querySelectorAll(".slider-nav .dot");
        let currentSlide = 0;
        let slideInterval = setInterval(nextSlide, 5000);

        function goToSlide(n) { slides.forEach((s, i) => s.classList.toggle("active", i === n)); dots.forEach((d, i) => d.classList.toggle("active", i === n)); }
        function nextSlide() { currentSlide = (currentSlide + 1) % slides.length; goToSlide(currentSlide); }
        dots.forEach((dot, index) => {
            dot.addEventListener("click", () => {
                currentSlide = index;
                goToSlide(index);
                clearInterval(slideInterval);
                slideInterval = setInterval(nextSlide, 5000);
            });
        });
    };

    const initPlayer = async () => {
        if (player) return;
        shaka.polyfill.installAll();
        if (shaka.Player.isBrowserSupported()) {
            player = new shaka.Player(allSelectors.videoElement);
            ui = new shaka.ui.Overlay(player, allSelectors.playerWrapper, allSelectors.videoElement);
            player.addEventListener("error", e => console.error("Player Error", e.detail));
        } else {
            console.error("Shaka Player not supported");
        }
    };
    const openPlayer = async (stream) => {
        await initPlayer();
        try {
            await player.load(stream.manifestUri);
            allSelectors.videoElement.play();
        } catch (error) {
            console.error("Error loading stream:", error);
        }
        document.getElementById("player-channel-name").textContent = stream.name;
        document.getElementById("player-channel-category").textContent = stream.category;
        
        if (!isDesktop()) {
            document.getElementById("minimized-player-logo").src = stream.logo;
            document.getElementById("minimized-player-name").textContent = stream.name;
            document.getElementById("minimized-player-category").textContent = stream.category;
            allSelectors.minimizedPlayer.classList.remove("active");
            allSelectors.playerView.classList.add("active");
        }
        history.pushState({ channel: stream.name }, "", `?play=${encodeURIComponent(stream.name.replace(/\s+/g, "-"))}`);
    };
    const minimizePlayer = () => {
        if (isDesktop()) return;
        if (allSelectors.playerView.classList.contains("active")) {
            allSelectors.playerView.classList.remove("active");
            allSelectors.minimizedPlayer.classList.add("active");
        }
    };
    const restorePlayer = (e) => {
        if (isDesktop() || e.target.closest("#exit-player-btn")) return;
        if (allSelectors.minimizedPlayer.classList.contains("active")) {
            allSelectors.minimizedPlayer.classList.remove("active");
            allSelectors.playerView.classList.add("active");
            allSelectors.videoElement.play();
        }
    };
    const closePlayer = async (e) => {
        e.stopPropagation();
        if (!isDesktop()) {
            allSelectors.playerView.classList.remove("active");
            allSelectors.minimizedPlayer.classList.remove("active");
        }
        if (player) await player.unload();
        history.pushState({}, "", window.location.pathname);
    };

    async function main() {
        await fetchApiData();
        allStreams = await fetchAndProcessM3U();
        if (allStreams.length === 0) return;

        setVideoPoster();
        window.addEventListener('resize', setVideoPoster);
        
        setupHeaderScroll();
        renderMenu();
        setupMenuInteractions();
        setupCountryPicker();
        setupSlider();
        renderCategoryPills();
        renderCountryList();
        applyFiltersAndRender();
        allSelectors.loadMoreBtn.addEventListener('click', loadMoreChannels);
        allSelectors.minimizeBtn.addEventListener('click', minimizePlayer);
        allSelectors.minimizedPlayer.addEventListener('click', restorePlayer);
        allSelectors.exitBtn.addEventListener('click', closePlayer);
        
        const params = new URLSearchParams(window.location.search);
        const channelToPlay = params.get('play');
        if (channelToPlay) {
            const streamToPlay = allStreams.find(s => s.name.replace(/\s+/g, '-') === channelToPlay);
            if (streamToPlay && isDesktop()) {
                openPlayer(streamToPlay);
            }
        }
    }

    main();
});
