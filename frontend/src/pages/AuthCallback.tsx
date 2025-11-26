import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { authAPI } from '../services/api';

// Add top-level logging to verify component loads
if (import.meta.env.DEV) console.log('[OAuth] AuthCallback component loaded - TOP OF FILE');

export default function AuthCallback() {
  if (import.meta.env.DEV) console.log('[OAuth] AuthCallback component rendered');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (import.meta.env.DEV) console.log('[OAuth] useEffect triggered, calling handleCallback');
    handleCallback();
  }, []);

  const handleCallback = async () => {
    try {
      if (import.meta.env.DEV) console.log('[OAuth] Starting callback handler...');
      if (import.meta.env.DEV) console.log('[OAuth] Current URL:', window.location.href);
      if (import.meta.env.DEV) console.log('[OAuth] URL Hash:', window.location.hash);
      if (import.meta.env.DEV) console.log('[OAuth] URL Search:', window.location.search);

      // Get the session from Supabase
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (import.meta.env.DEV) console.log('[OAuth] Session data:', session);
      if (import.meta.env.DEV) console.log('[OAuth] Session error:', sessionError);

      if (sessionError) {
        console.error('[OAuth] Session error:', sessionError);
        throw sessionError;
      }

      if (session?.user) {
        const { email, user_metadata } = session.user;
        const name = user_metadata?.full_name || user_metadata?.name || email?.split('@')[0] || 'User';

        if (import.meta.env.DEV) console.log('[OAuth] User data:', { email, name, id: session.user.id });

        // Sync the OAuth user with our backend (this sets the auth token in localStorage)
        if (import.meta.env.DEV) console.log('[OAuth] Calling oauthSync...');
        const result = await authAPI.oauthSync(email!, name, session.user.id);
        if (import.meta.env.DEV) console.log('[OAuth] Sync result:', result);

        // Verify token was set
        const token = localStorage.getItem('auth_token');
        if (import.meta.env.DEV) console.log('[OAuth] Token in localStorage:', token ? 'EXISTS' : 'MISSING');

        // Redirect to dashboard (full page reload will load the user from the token)
        if (import.meta.env.DEV) console.log('[OAuth] Redirecting to dashboard...');
        window.location.href = '/dashboard';
      } else {
        console.error('[OAuth] No session found');
        setError('No session found. Please try again.');
        setTimeout(() => window.location.href = '/login', 2000);
      }
    } catch (error: any) {
      console.error('[OAuth] Callback error:', error);
      console.error('[OAuth] Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      setError(error.response?.data?.message || error.message || 'Authentication failed. Please try again.');
      setTimeout(() => window.location.href = '/login', 2000);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        {error ? (
          <>
            <div className="text-red-600 mb-4">{error}</div>
            <p className="text-gray-600">Redirecting to login...</p>
          </>
        ) : (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto"></div>
            <p className="mt-4 text-gray-600">Completing sign in...</p>
          </>
        )}
      </div>
    </div>
  );
}
