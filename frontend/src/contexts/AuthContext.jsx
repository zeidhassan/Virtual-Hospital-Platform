import { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { setAccessToken, clearAccessToken } from '@/api/client';
import * as authApi from '@/api/auth';

const AuthContext = createContext(null);

// Backend responses key the display name as `full_name`; normalize it to
// `name` so every consumer (Sidebar, dashboards, greetings, etc.) can rely
// on a single field instead of falling back to the email address.
const normalizeUser = (user) => (user ? { ...user, name: user.name || user.full_name || '' } : user);

const initialState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
};

function authReducer(state, action) {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, user: action.payload, isAuthenticated: true, isLoading: false };
    case 'LOGOUT':
      return { ...state, user: null, isAuthenticated: false, isLoading: false };
    case 'LOADED':
      return { ...state, isLoading: false };
    default:
      return state;
  }
}

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // On mount: try to restore session from a stored token
  useEffect(() => {
    const restoreSession = async () => {
      const stored = localStorage.getItem('hxc_token');

      if (!stored) {
        dispatch({ type: 'LOADED' });
        return;
      }

      // Set the token in memory so the request interceptor can use it
      setAccessToken(stored);

      try {
        // Attempt to verify the token with the backend
        const { data } = await authApi.getMe();
        const user = normalizeUser(data.user || data);
        dispatch({ type: 'SET_USER', payload: user });
      } catch {
        // Token is invalid/expired — the server is the only source of truth
        // for who's logged in. Falling back to the cached hxc_user here
        // would let a client-edited localStorage value (e.g. a tampered
        // "role") stand in as an authenticated session.
        clearSession();
        dispatch({ type: 'LOADED' });
      }
    };

    restoreSession();
  }, []);

  const clearSession = () => {
    clearAccessToken();
    localStorage.removeItem('hxc_token');
    localStorage.removeItem('hxc_user');
  };

  const login = useCallback(async (credentials) => {
    const { data } = await authApi.login(credentials);

    // Backend may return { token, user } or { token, role, userId, ... }
    const token = data.token || data.accessToken;
    const user = normalizeUser(data.user || {
      id: data.userId || data.id,
      role: data.role,
      email: credentials.email,
      name: data.name || data.username || '',
    });

    setAccessToken(token);
    localStorage.setItem('hxc_token', token);
    localStorage.setItem('hxc_user', JSON.stringify(user));

    dispatch({ type: 'SET_USER', payload: user });
    return user;
  }, []);

  const register = useCallback(async (userData) => {
    const { data } = await authApi.register(userData);

    const token = data.token || data.accessToken;
    const user = normalizeUser(data.user || {
      id: data.userId || data.id,
      role: userData.role,
      email: userData.email,
      name: userData.name || userData.username || '',
    });

    if (token) {
      setAccessToken(token);
      localStorage.setItem('hxc_token', token);
      localStorage.setItem('hxc_user', JSON.stringify(user));
      dispatch({ type: 'SET_USER', payload: user });
    } else {
      // Registration successful but no auto-login (email verification needed)
      dispatch({ type: 'LOADED' });
    }

    return user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Logout even if request fails
    }
    clearSession();
    dispatch({ type: 'LOGOUT' });
  }, []);

  // Re-pulls /auth/me so edits made on the profile page (name, picture, etc.)
  // show up immediately in the Sidebar/Topbar instead of waiting for the next login.
  const refreshUser = useCallback(async () => {
    try {
      const { data } = await authApi.getMe();
      const user = normalizeUser(data.user || data);
      localStorage.setItem('hxc_user', JSON.stringify(user));
      dispatch({ type: 'SET_USER', payload: user });
      return user;
    } catch {
      return null;
    }
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
