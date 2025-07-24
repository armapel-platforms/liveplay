document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('search-input');
    const searchResults = document.getElementById('search-results');

    searchInput.addEventListener('input', () => {
        const query = searchInput.value.toLowerCase();
        searchResults.innerHTML = '';
        if (query.length > 0) {
            const results = streams.filter(stream => stream.name.toLowerCase().includes(query));
            results.forEach(stream => {
                const resultItem = document.createElement('div');
                resultItem.textContent = stream.name;
                // Add styling and click event to play the channel
                searchResults.appendChild(resultItem);
            });
        }
    });
});
