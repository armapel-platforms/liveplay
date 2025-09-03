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
        const remoteControl = document.getElementById('remote-control');
        const liveIndicatorCorner = document.getElementById('live-indicator-corner');
        const exitPopupOverlay = document.getElementById('exit-popup-overlay');
        const exitConfirmBtn = document.getElementById('exit-confirm-btn');
        const exitCancelBtn = document.getElementById('exit-cancel-btn');
        const sidebar = document.getElementById('sidebar');
        const channelListContainer = document.getElementById('channel-list-container');
        const timeDateElement = document.getElementById('time-date');
        let player;

        let scrollTimeout;
        let scrollInterval;
        const scrollDelay = 400;
        const scrollSpeed = 100;

        async function init() {
            try {
                const response = await fetch('/api/getChannels.js');
                if (!response.ok) throw new Error('Network response was not ok');
                channelList = await response.json();

                if (channelList.length === 0) {
                    throw new Error("Channel list is empty.");
                }

                shaka.polyfill.installAll();
                if (shaka.Player.isBrowserSupported()) await initPlayer();
                else console.error('Browser not supported!');

                document.addEventListener('keydown', handleKeyDown);
                clickOverlay.addEventListener('click', showAndHideInfo);
                setupRemoteClickListeners();
                populateChannelList();
                updateTimeDate();
                setInterval(updateTimeDate, 1000);

            } catch (error) {
                console.error("Failed to initialize app:", error);
                channelName.textContent = "Error";
                channelCategory.textContent = "Could not load channels.";
            }
        }

        async function initPlayer() {
            player = new shaka.Player(video);
            player.addEventListener('error', onErrorEvent);
            await loadChannel(channelList[currentChannelIndex]);
            showAndHideInfo();
        }
        
        function moveFocus(direction) {
            if (direction === 1) {
                currentFocusIndex = Math.min(channelList.length - 1, currentFocusIndex + 1);
            } else {
                currentFocusIndex = Math.max(0, currentFocusIndex - 1);
            }
            updateFocus();
        }

        function startScrolling(direction) {
            stopScrolling();
            moveFocus(direction);

            scrollTimeout = setTimeout(() => {
                scrollInterval = setInterval(() => {
                    moveFocus(direction);
                }, scrollSpeed);
            }, scrollDelay);
        }

        function stopScrolling() {
            clearTimeout(scrollTimeout);
            clearInterval(scrollInterval);
        }

        function toggleSidebar() {
            if (isSidebarActive) {
                hideSidebar();
            } else {
                showSidebar();
            }
        }

        function setupRemoteClickListeners() {
            const btnUp = document.getElementById('btn-up');
            const btnDown = document.getElementById('btn-down');

            btnUp.addEventListener('mousedown', () => {
                if (isSidebarActive) {
                    startScrolling(-1);
                } else {
                    changeChannel(1);
                }
            });

            btnDown.addEventListener('mousedown', () => {
                if (isSidebarActive) {
                    startScrolling(1);
                } else {
                    changeChannel(-1);
                }
            });

            btnUp.addEventListener('mouseup', stopScrolling);
            btnUp.addEventListener('mouseleave', stopScrolling);
            btnDown.addEventListener('mouseup', stopScrolling);
            btnDown.addEventListener('mouseleave', stopScrolling);
            document.getElementById('btn-left').addEventListener('click', toggleSidebar);
            document.getElementById('btn-right').addEventListener('click', showExitPopup);

            document.getElementById('btn-ok').addEventListener('click', () => {
                if (isSidebarActive) {
                    selectChannelFromList();
                } else {
                    showAndHideInfo();
                }
            });
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
            if (event.repeat) return;
            event.preventDefault();

            if (isExitPopupActive) {
                const currentFocus = document.activeElement;
                if (event.keyCode === 37) { if (currentFocus === exitConfirmBtn) exitCancelBtn.focus(); }
                else if (event.keyCode === 39) { if (currentFocus === exitCancelBtn) exitConfirmBtn.focus(); }
                else if (event.keyCode === 13) { currentFocus.click(); }
                else if (event.keyCode === 8 || event.keyCode === 461 || event.keyCode === 10009) { handleExitCancel(); }
            } else if (isSidebarActive) {
                switch (event.keyCode) {
                    case 37:
                        hideSidebar();
                        break;
                    case 38: 
                        currentFocusIndex = Math.max(0, currentFocusIndex - 1);
                        updateFocus();
                        break;
                    case 40: 
                        currentFocusIndex = Math.min(channelList.length - 1, currentFocusIndex + 1);
                        updateFocus();
                        break;
                    case 13:
                        selectChannelFromList();
                        break;
                    case 8: case 461: case 10009:
                         hideSidebar();
                         break;
                }
            } else {
                switch (event.keyCode) {
                    case 37:
                        showSidebar();
                        break;
                    case 39:
                        showExitPopup();
                        break;
                    case 13:
                        showAndHideInfo();
                        break;
                    case 8: case 461: case 10009:
                        showExitPopup();
                        break;
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

        function handleExitConfirm() { window.close(); }
        function handleExitCancel() { hideExitPopup(); }
        function onErrorEvent(event) { onError(event.detail); }
        function onError(error) { console.error('Shaka Player Error:', error.code, 'object', error); }

        document.addEventListener('DOMContentLoaded', init);
