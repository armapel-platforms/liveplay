const SUPABASE_URL = 'https://rgbucdhgkipbpnmbeiyh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJnYnVjZGhna2lwYnBubWJlaXloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1MjYxMTcsImV4cCI6MjA3MjEwMjExN30.b0nAdoC2Itv9qWu9AKpvAQ5amwYMYSZxeRcPOb1A1A0';

const { createClient } = supabase;
const _supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const authHandler = {
  getCurrentUser: async () => {
    const { data: { session } } = await _supabase.auth.getSession();
    if (!session) return null;
    const { data: profile, error } = await _supabase.from('profiles').select('first_name, last_name').eq('id', session.user.id).single();
    return error ? { ...session.user } : { ...session.user, ...profile };
  },
  onAuthStateChange: (callback) => {
    _supabase.auth.onAuthStateChange(async (event, session) => {
      const user = session ? await authHandler.getCurrentUser() : null;
      callback(user);
    });
  },
  signUp: async (credentials) => {
    const { first_name, last_name, email, password } = credentials;
    return await _supabase.auth.signUp({ email, password, options: { data: { first_name, last_name } } });
  },
  verifyOtp: async (email, token) => {
    return await _supabase.auth.verifyOtp({ email, token, type: 'signup' });
  },
  resendOtp: async (email) => {
    return await _supabase.auth.resend({ type: 'signup', email });
  },
  logIn: async (credentials) => {
    const { email, password } = credentials;
    return await _supabase.auth.signInWithPassword({ email, password });
  },
  logOut: async () => {
    return await _supabase.auth.signOut();
  },
  sendPasswordResetOtp: async (email) => {
    return await _supabase.auth.resetPasswordForEmail(email);
  },
  verifyPasswordResetOtp: async (email, token) => {
    return await _supabase.auth.verifyOtp({ email, token, type: 'recovery' });
  },
  updateUserPassword: async (newPassword) => {
    return await _supabase.auth.updateUser({ password: newPassword });
  },
  updateUserProfile: async (profileData) => {
    const { data: { user } } = await _supabase.auth.getUser();
    if (!user) return { error: { message: "User not logged in." } };
    return await _supabase.from('profiles').update(profileData).eq('id', user.id);
  },
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
