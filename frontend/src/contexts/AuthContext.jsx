import { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { setAccessToken, clearAccessToken } from '@/api/client';
import * as authApi from '@/api/auth';

const AuthContext = createContext(null);

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
      const storedUser = localStorage.getItem('hxc_user');

      if (!stored) {
        dispatch({ type: 'LOADED' });
        return;
      }

      // Set the token in memory so the request interceptor can use it
      setAccessToken(stored);

      try {
        // Attempt to verify the token with the backend
        const { data } = await authApi.getMe();
        const user = data.user || data;
        dispatch({ type: 'SET_USER', payload: user });
      } catch {
        // Token is invalid/expired — try to use stored user for graceful fallback
        if (storedUser) {
          try {
            dispatch({ type: 'SET_USER', payload: JSON.parse(storedUser) });
          } catch {
            clearSession();
            dispatch({ type: 'LOADED' });
          }
        } else {
          clearSession();
          dispatch({ type: 'LOADED' });
        }
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
    const user = data.user || {
      id: data.userId || data.id,
      role: data.role,
      email: credentials.email,
      name: data.name || data.username || '',
    };

    setAccessToken(token);
    localStorage.setItem('hxc_token', token);
    localStorage.setItem('hxc_user', JSON.stringify(user));

    dispatch({ type: 'SET_USER', payload: user });
    return user;
  }, []);

  const register = useCallback(async (userData) => {
    const { data } = await authApi.register(userData);

    const token = data.token || data.accessToken;
    const user = data.user || {
      id: data.userId || data.id,
      role: userData.role,
      email: userData.email,
      name: userData.name || userData.username || '',
    };

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

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout }}>
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
