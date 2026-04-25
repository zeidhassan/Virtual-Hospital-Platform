import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { setAccessToken } from '@/api/client';
import * as authApi from '@/api/auth';
import { useAuth } from '@/hooks/useAuth';
import Spinner from '@/components/ui/Spinner';

const ROLE_HOME = {
  patient: '/patient/dashboard',
  doctor: '/doctor/dashboard',
  admin: '/admin/dashboard',
};

/**
 * Handles the redirect from the backend after Google / Facebook OAuth.
 * URL pattern: /login-callback/:provider?token=<jwt>
 *
 * Steps:
 *  1. Read ?token= from query string
 *  2. Store token in memory + localStorage
 *  3. Call GET /api/auth/me to get the user object
 *  4. Dispatch SET_USER and redirect to role dashboard
 */
const OAuthCallbackPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login: _login, ...authState } = useAuth();
  const ranRef = useRef(false);

  useEffect(() => {
    // Guard against double-invocation in React Strict Mode
    if (ranRef.current) return;
    ranRef.current = true;

    const token = searchParams.get('token');

    if (!token) {
      navigate('/login?error=oauth_failed', { replace: true });
      return;
    }

    const finalise = async () => {
      // Store token so the axios interceptor picks it up
      setAccessToken(token);
      localStorage.setItem('hxc_token', token);

      try {
        const { data } = await authApi.getMe();
        const user = data.user || data;

        localStorage.setItem('hxc_user', JSON.stringify(user));

        // Update AuthContext by dispatching through the context's internal login
        // We use a custom event so AuthContext.restoreSession picks up the new token
        // on the next mount; for now trigger a full page reload to re-run restoreSession.
        // This is the simplest, most reliable approach for an OAuth redirect flow.
        window.location.replace(ROLE_HOME[user.role] || '/patient/dashboard');
      } catch {
        localStorage.removeItem('hxc_token');
        localStorage.removeItem('hxc_user');
        navigate('/login?error=oauth_failed', { replace: true });
      }
    };

    finalise();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <Spinner size="lg" />
      <p className="text-sm text-text-secondary">Completing sign-in&hellip;</p>
    </div>
  );
};

export default OAuthCallbackPage;
