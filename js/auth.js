const SUPABASE_URL = 'https://bcydtppfbpbahzswkdux.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJjeWR0cHBmYnBiYWh6c3drZHV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1Mjg0MzMsImV4cCI6MjA3MjEwNDQzM30.AydruahgL-STu6OYAx23IHt14dGaW6WVXPIKyuzrke8';

const { createClient } = supabase;
const _supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const authHandler = {
  // Fetches the currently logged-in user's session and profile data.
  getCurrentUser: async () => {
    const { data: { session } } = await _supabase.auth.getSession();
    if (!session) return null;
    const { data: profile, error } = await _supabase.from('profiles').select('first_name, last_name').eq('id', session.user.id).single();
    return error ? { ...session.user } : { ...session.user, ...profile };
  },

  // Signs up a new user. Supabase handles sending the confirmation email if enabled.
  signUp: async (credentials) => {
    const { first_name, last_name, email, password } = credentials;
    return await _supabase.auth.signUp({ email, password, options: { data: { first_name, last_name } } });
  },

  // Verifies the 6-digit OTP code sent to the user's email after signup.
  verifyOtp: async (email, token) => {
    return await _supabase.auth.verifyOtp({ email, token, type: 'signup' });
  },

  // Resends the OTP confirmation email.
  resendOtp: async (email) => {
    return await _supabase.auth.resend({ type: 'signup', email });
  },

  // Signs in an existing user with their email and password.
  logIn: async (credentials) => {
    const { email, password } = credentials;
    return await _supabase.auth.signInWithPassword({ email, password });
  },

  // Signs out the currently logged-in user.
  logOut: async () => await _supabase.auth.signOut(),

  // Sends a password reset magic link to the user's email.
  sendPasswordResetOtp: async (email) => {
    // The redirectTo URL is where the user will be sent after clicking the magic link.
    return await _supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/account.html',
    });
  },

  // Updates the password for the currently logged-in user.
  updateUserPassword: async (newPassword) => {
    return await _supabase.auth.updateUser({ password: newPassword });
  },

  // Updates non-password profile data (like first_name) for the current user.
  updateUserProfile: async (profileData) => {
    const { data: { user } } = await _supabase.auth.getUser();
    if (!user) return { error: { message: "User not logged in." } };
    return await _supabase.from('profiles').update(profileData).eq('id', user.id);
  },

  // Securely calls the 'delete-user' Edge Function to permanently delete the account.
  deleteUserAccount: async () => {
    const { data: { session } } = await _supabase.auth.getSession();
    if (!session) return { error: { message: "User is not logged in." } };
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/delete-user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` }
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Request failed with status ${response.status}`);
      }
      await _supabase.auth.signOut();
      return { data: { message: "Account deletion successful." } };
    } catch (error) {
      console.error("Failed to delete user account:", error);
      return { error };
    }
  }
};

window.auth = authHandler;
