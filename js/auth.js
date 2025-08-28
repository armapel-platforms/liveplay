const SUPABASE_URL = 'https://nfqkreiahnsiwrpbihqs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5mcWtyZWlhaG5zaXdycGJpaHFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzNjQ4NTYsImV4cCI6MjA3MTk0MDg1Nn0.p4b-jC6X9sPZYl3jRqrLjJfyOYEIkY_R1XD2g7ef4sk';

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

  updateUserEmail: async (newEmail) => {
    return await _supabase.auth.updateUser({ email: newEmail });
  },
  
  updateUserProfile: async (profileData) => {
    const { data: { user } } = await _supabase.auth.getUser();
    if (!user) return { error: { message: "User not logged in." } };
    return await _supabase.from('profiles').update(profileData).eq('id', user.id);
  },
  
  deleteUserAccount: async () => {
    // Securely calls the 'delete-user' Edge Function
    const { data, error } = await _supabase.functions.invoke('delete-user');
    
    if (error) {
      console.error("Failed to delete user account via Edge Function:", error.message);
      return { error };
    }
    
    await _supabase.auth.signOut();
    return { data };
  }
};

window.auth = authHandler;
