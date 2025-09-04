document.addEventListener('DOMContentLoaded', () => {
    const codeEntryContainer = document.getElementById('code-entry-container');
    const remoteControlContainer = document.getElementById('remote-control-container');
    const connectButton = document.getElementById('connect-btn');
    const codeInput = document.getElementById('code-input');

    // This script will only run on mobile/tablet devices due to the redirect script in remote.html.
    // In a real application, you would initialize a WebSocket connection here.
    // const socket = new WebSocket('ws://your-backend-url');

    connectButton.addEventListener('click', () => {
        const enteredCode = codeInput.value;
        if (enteredCode.length === 4 && /^\d{4}$/.test(enteredCode)) {
            // In a real app, you would send this code to your backend to verify.
            // For example:
            // socket.send(JSON.stringify({ type: 'pair', code: enteredCode }));

            // For this example, we'll simulate a successful connection and show the remote.
            console.log(`Attempting to connect with code: ${enteredCode}`);
            codeEntryContainer.style.display = 'none';
            remoteControlContainer.style.display = 'flex';
        } else {
            alert('Please enter a valid 4-digit code.');
            codeInput.value = ''; // Clear the input for re-entry
        }
    });

    // --- Remote Control Button Logic ---
    // This adds a click event listener to each button in the remote grid.
    const remoteButtons = document.querySelectorAll('.remote-btn');

    remoteButtons.forEach(button => {
        button.addEventListener('click', () => {
            const command = button.id.replace('btn-', ''); // Extracts 'up', 'down', 'ok', etc.

            // In a real app, you would send the command over the WebSocket connection.
            // For example:
            // socket.send(JSON.stringify({ action: 'remote-press', key: command }));

            console.log(`Sending command: ${command}`);

            // Provides haptic feedback on supported mobile devices for a better user experience.
            if (navigator.vibrate) {
                navigator.vibrate(50); // Vibrate for 50 milliseconds
            }
        });
    });

    // In a real app, you might also listen for messages from the server,
    // for example, to know if the TV disconnects.
    // socket.onclose = () => {
    //     alert("Connection to the TV was lost. Please reconnect.");
    //     remoteControlContainer.style.display = 'none';
    //     codeEntryContainer.style.display = 'flex';
    //     codeInput.value = '';
    // };
});
