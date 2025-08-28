// NOTE: Replace with your actual Supabase URL and Anon Key
const SUPABASE_URL = 'https://REPLACE_WITH_YOUR_SUPABASE_URL.supabase.co';
const SUPABASE_ANON_KEY = 'REPLACE_WITH_YOUR_SUPABASE_ANON_KEY';

const { createClient } = supabase;
const _supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const authHandler = {
  getCurrentUser: async () => {
    const { data: { session } } = await _supabase.auth.getSession();
    if (!session) return null;
    
    const { data: profile, error } = await _supabase
      .from('profiles')
      .select('first_name, middle_name, last_name, username')
      .eq('id', session.user.id)
      .single();
    
    return error ? { ...session.user } : { ...session.user, ...profile };
  },
  
  onAuthStateChange: (callback) => {
    _supabase.auth.onAuthStateChange(async (event, session) => {
      const user = session ? await authHandler.getCurrentUser() : null;
      callback(user);
    });
  },
  
  signUp: async (credentials) => {
    const { first_name, middle_name, last_name, username, email, password } = credentials;
    return await _supabase.auth.signUp({
      email,
      password,
      options: {
        data: { first_name, middle_name, last_name, username },
      }
    });
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
    const user = await authHandler.getCurrentUser();
    if (!user) return { error: { message: "User not logged in." } };
    return await _supabase.from('profiles').update(profileData).eq('id', user.id);
  },
  
  deleteUserAccount: async (feedback) => {
    const user = await authHandler.getCurrentUser();
    if (!user) return { error: { message: "User not logged in." } };

    // Insert feedback into the new table
    const { error: feedbackError } = await _supabase
      .from('deletion_feedback')
      .insert([
        { user_id: user.id, reasons: feedback.reasons, other_reason_text: feedback.otherReasonText }
      ]);

    if (feedbackError) {
      console.error("Error saving deletion feedback:", feedbackError);
    }
    
    // Note: Supabase admin rights are required to delete a user.
    // This should be handled in a secure server-side environment (e.g., an Edge Function).
    // The following is a client-side logout for demonstration.
    console.warn("User deletion should be handled by a secure Edge Function.");
    return await authHandler.logOut();
  }
};

window.auth = authHandler;
