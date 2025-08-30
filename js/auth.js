const SUPABASE_URL = 'https://nfqkreiahnsiwrpbihqs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5mcWtyZWlhaG5zaXdycGJpaHFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzNjQ4NTYsImV4cCI6MjA3MTk0MDg1Nn0.p4b-jC6X9sPZYl3jRqrLjJfyOYEIkY_R1XD2g7ef4sk';

const { createClient } = supabase;
const _supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const authHandler = {
  getCurrentUser: async () => {
    const { data: { session } } = await _supabase.auth.getSession();
    if (!session) return null;
    
    // Updated to select only the fields that now exist
    const { data: profile, error } = await _supabase
      .from('profiles')
      .select('first_name, last_name')
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
    // Updated to handle the simplified registration form
    const { first_name, last_name, email, password } = credentials;
    return await _supabase.auth.signUp({
      email,
      password,
      options: {
        data: { first_name, last_name },
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
  
  deleteUserAccount: async () => {
    // 1. Get the current user's session to retrieve their JWT (access token).
    const { data: { session }, error: sessionError } = await _supabase.auth.getSession();
    if (sessionError) {
      console.error("Error getting session:", sessionError);
      return { error: sessionError };
    }
    if (!session) {
      const err = { message: "User is not logged in." };
      return { error: err };
    }

    try {
      // 2. Call the 'delete-user' Edge Function securely.
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/delete-user`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            // Pass the user's JWT to prove their identity to the Edge Function.
            'Authorization': `Bearer ${session.access_token}`
          }
        }
      );

      // 3. Check if the Edge Function returned an error.
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Request failed with status ${response.status}`);
      }
      
      // 4. After a successful server-side deletion, sign the user out on the client.
      await _supabase.auth.signOut();
      return { data: { message: "Account deletion initiated successfully." } };

    } catch (error) {
      console.error("Failed to call delete user function:", error);
      return { error };
    }
  }
};

window.auth = authHandler;
