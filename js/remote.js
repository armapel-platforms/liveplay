// remote.js

document.addEventListener('DOMContentLoaded', () => {
    // --- 1. CONFIGURE SUPERBASE ---
    // Paste the SAME Project URL and anon public key you used in tv.js
    const SUPABASE_URL = 'https://sstlszevsvtxghumzujx.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNzdGxzemV2c3Z0eGdodW16dWp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5NTc2MzcsImV4cCI6MjA3MjUzMzYzN30.cJ68NKB1Oh2DMuazoXV36tKyIjXmTDojTy_gnLXLzsA';

    // Correctly initialize the Supabase client
    const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    let pairingCode;

    // --- DOM ELEMENT VARIABLES ---
    const codeEntryContainer = document.getElementById('code-entry-container');
    const remoteControlContainer = document.getElementById('remote-control-container');
    const connectButton = document.getElementById('connect-btn');
    const codeInput = document.getElementById('code-input');
    const remoteButtons = document.querySelectorAll('.remote-btn');

    /**
     * Handles the click on the "Connect" button. It validates the code,
     * checks for stale rooms, and establishes the connection.
     */
    const handleConnect = async () => {
        const enteredCode = codeInput.value;
        if (!/^\d{4}$/.test(enteredCode)) {
            alert('Please enter a valid 4-digit code.');
            return;
        }

        pairingCode = parseInt(enteredCode);
        
        // Provide user feedback during connection attempt
        connectButton.disabled = true;
        connectButton.textContent = 'Connecting...';

        try {
            // Check if the room exists in the database
            // Use the corrected supabaseClient variable
            const { data, error } = await supabaseClient
                .from('rooms')
                .select('id, created_at')
                .eq('id', pairingCode)
                .single(); // Expect only one result

            if (error || !data) {
                throw new Error('Code is incorrect or the TV is disconnected.');
            }

            // Prevent connecting to old, "ghost" rooms (e.g., from a closed tab)
            const FIVE_MINUTES_IN_MS = 5 * 60 * 1000;
            const roomAge = Date.now() - new Date(data.created_at).getTime();
            if (roomAge > FIVE_MINUTES_IN_MS) {
                // Clean up the stale room
                // Use the corrected supabaseClient variable
                await supabaseClient.from('rooms').delete().eq('id', pairingCode);
                throw new Error('This TV code has expired. Please refresh your TV.');
            }
            
            // Room is valid. Update its status to notify the TV.
            // Use the corrected supabaseClient variable
            const { error: updateError } = await supabaseClient
                .from('rooms')
                .update({ status: 'remote_connected' })
                .eq('id', pairingCode);
            
            if (updateError) {
                throw new Error('Could not connect to the TV. Please try again.');
            }

            console.log('Successfully connected to TV room.');
            codeEntryContainer.style.display = 'none';
            remoteControlContainer.style.display = 'flex';

        } catch (err) {
            alert(`Pairing Failed: ${err.message}`);
        } finally {
            // Always re-enable the button after the attempt is finished
            connectButton.disabled = false;
            connectButton.textContent = 'Connect';
        }
    };

    /**
     * Handles clicks on any of the remote control buttons and sends the
     * command to the Supabase database.
     */
    const handleRemotePress = async (event) => {
        if (!pairingCode) return; // Guard against sending commands before connecting

        const button = event.currentTarget;
        const commandKey = button.id.replace('btn-', '');
        
        // Update the 'command' field in the database. The TV is listening for this.
        // Use the corrected supabaseClient variable
        const { error } = await supabaseClient
            .from('rooms')
            .update({ command: { key: commandKey, timestamp: Date.now() } })
            .eq('id', pairingCode);

        if (error) {
            console.error('Failed to send command:', error);
            // Optionally, you could show an error to the user here
        }
        
        // Provide haptic feedback on mobile
        if (navigator.vibrate) {
            navigator.vibrate(50);
        }
    };

    // --- ATTACH EVENT LISTENERS ---
    connectButton.addEventListener('click', handleConnect);
    remoteButtons.forEach(button => {
        button.addEventListener('click', handleRemotePress);
    });
});
