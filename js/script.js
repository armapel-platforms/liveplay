// Replace the current openPlayer function in script.js with this one

const openPlayer = async (stream) => {
    activeStream = stream;

    const playerContainer = document.getElementById('video-player');
    const youtubePlayer = document.getElementById('youtube-player');

    // Remove any existing JW Player instance to prevent conflicts
    if (playerInstance) {
        playerInstance.remove();
        playerInstance = null;
    }

    if (stream.type === 'youtube') {
        // YOUTUBE LOGIC: Show the iframe, hide the JW Player container
        if (playerContainer) playerContainer.style.display = 'none';
        if (youtubePlayer) {
            youtubePlayer.src = stream.embedUrl;
            youtubePlayer.style.display = 'block';
        }
    } else {
        // REGULAR STREAM LOGIC: Show the JW Player container, hide the iframe
        if (youtubePlayer) {
            youtubePlayer.src = '';
            youtubePlayer.style.display = 'none';
        }
        if (playerContainer) playerContainer.style.display = 'block';

        try {
            const response = await fetch(`/api/getStream?name=${encodeURIComponent(stream.name)}`);
            if (!response.ok) throw new Error(`Stream data not found for ${stream.name}.`);
            const secureData = await response.json();

            const playerConfig = {
                file: secureData.manifestUri,
                drm: { clearkey: secureData.clearKey },
                autostart: true,
                width: '100%',
                aspectratio: '16:9'
            };

            playerInstance = jwplayer('video-player').setup(playerConfig);
            playerInstance.on('error', (e) => console.error('JW Player Error', e));

        } catch (e) {
            console.error('Player Setup Error', e);
        }
    }

    document.getElementById('player-channel-name').textContent = stream.name;
    document.getElementById('player-channel-category').textContent = stream.category;
    
    if (!isDesktop()) {
        document.getElementById('minimized-player-logo').src = stream.logo;
        document.getElementById('minimized-player-name').textContent = stream.name;
        document.getElementById('minimized-player-category').textContent = stream.category;
        if (minimizedPlayer) minimizedPlayer.classList.remove('active');
        if (playerView) playerView.classList.add('active');
    }
};
