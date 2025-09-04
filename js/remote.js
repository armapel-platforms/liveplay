const SUPABASE_URL = 'https://efqaangjtclacltygaqr.supabase.co'; // Paste your URL
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmcWFhbmdqdGNsYWNsdHlnYXFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5NjEwNzQsImV4cCI6MjA3MjUzNzA3NH0.Q3-UEvj23cnqUhBBGs7KZhsgN3y65bbGfUdZelDrubw'; // Paste your anon public key

// --- 2. APPLICATION LOGIC ---
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
let pairingCode;

// DOM Element Variables
const codeEntryContainer = document.getElementById('code-entry-container');
const remoteControlContainer = document.getElementById('remote-control-container');
const connectButton = document.getElementById('connect-btn');
const codeInput = document.getElementById('code-input');
const remoteButtons = document.querySelectorAll('.remote-btn');

/** Handles the click on the "Connect" button */
const handleConnect = async () => {
    const enteredCode = codeInput.value;
    if (!/^\d{4}$/.test(enteredCode)) {
        alert('Please enter a valid 4-digit code.');
        return;
    }
    pairingCode = parseInt(enteredCode);
    
    connectButton.disabled = true;
    connectButton.textContent = 'Connecting...';

    try {
        const { data, error } = await supabaseClient
            .from('rooms')
            .select('id')
            .eq('id', pairingCode)
            .single();

        if (error || !data) throw new Error('Code is incorrect or the TV is disconnected.');
        
        const { error: updateError } = await supabaseClient
            .from('rooms')
            .update({ status: 'remote_connected' })
            .eq('id', pairingCode);
        
        if (updateError) throw new Error('Could not connect to the TV. Please try again.');

        codeEntryContainer.classList.add('hidden');
        remoteControlContainer.classList.remove('hidden');

    } catch (err) {
        alert(`Pairing Failed: ${err.message}`);
    } finally {
        connectButton.disabled = false;
        connectButton.textContent = 'Connect';
    }
};

/** Handles clicks on any of the remote control buttons and sends command to Supabase */
const handleRemotePress = async (event) => {
    if (!pairingCode) return;
    const commandKey = event.currentTarget.id.replace('btn-', '');
    
    await supabaseClient
        .from('rooms')
        .update({ command: { key: commandKey, timestamp: Date.now() } })
        .eq('id', pairingCode);

    if (navigator.vibrate) navigator.vibrate(50);
};

// Attach Event Listeners
connectButton.addEventListener('click', handleConnect);
remoteButtons.forEach(button => {
    button.addEventListener('click', handleRemotePress);
});
