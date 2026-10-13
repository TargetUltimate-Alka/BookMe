import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../api/authApi';
import { setAuthContext as setEventsBookingAuth } from '../../events-booking/api/client';

const AuthContext = createContext(null);

const STORAGE_KEY_TOKEN = 'bookme_access_token';
const STORAGE_KEY_REFRESH = 'bookme_refresh_token';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [refreshToken, setRefreshToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Helper to persist session in sessionStorage
  const saveSession = useCallback((token, refresh, userData) => {
    setAccessToken(token);
    setRefreshToken(refresh);
    setUser(userData);

    if (typeof sessionStorage !== 'undefined') {
      if (token) sessionStorage.setItem(STORAGE_KEY_TOKEN, token);
      else sessionStorage.removeItem(STORAGE_KEY_TOKEN);

      if (refresh) sessionStorage.setItem(STORAGE_KEY_REFRESH, refresh);
      else sessionStorage.removeItem(STORAGE_KEY_REFRESH);
    }

    // Keep events-booking API client in sync with real authenticated user
    if (userData && userData.id) {
      setEventsBookingAuth(userData.id, userData.role);
    }
  }, []);

  const clearSession = useCallback(() => {
    setAccessToken(null);
    setRefreshToken(null);
    setUser(null);

    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem(STORAGE_KEY_TOKEN);
      sessionStorage.removeItem(STORAGE_KEY_REFRESH);
    }

    setEventsBookingAuth(null, null);
  }, []);

  // Restore session safely on startup
  useEffect(() => {
    async function restoreSession() {
      setIsLoading(true);
      setError(null);

      try {
        const storedToken =
          typeof sessionStorage !== 'undefined'
            ? sessionStorage.getItem(STORAGE_KEY_TOKEN)
            : null;
        const storedRefresh =
          typeof sessionStorage !== 'undefined'
            ? sessionStorage.getItem(STORAGE_KEY_REFRESH)
            : null;

        if (storedToken) {
          try {
            // Verify access token by fetching live user profile
            const profile = await authApi.getMe(storedToken);
            saveSession(storedToken, storedRefresh, profile);
          } catch {
            // Access token might be expired, attempt refresh
            if (storedRefresh) {
              try {
                const refreshed = await authApi.refresh(storedRefresh);
                const profile = await authApi.getMe(refreshed.accessToken);
                saveSession(refreshed.accessToken, storedRefresh, profile);
              } catch {
                clearSession();
              }
            } else {
              clearSession();
            }
          }
        }
      } catch {
        clearSession();
      } finally {
        setIsLoading(false);
      }
    }

    restoreSession();
  }, [clearSession, saveSession]);

  // Login handler
  const login = async ({ email, password }) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await authApi.login({ email, password });
      saveSession(res.accessToken, res.refreshToken, res.user);
      return res.user;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Register handler (FR-ONB-01 / Phase Four: do not auto-login unless requested)
  const register = async ({ name, email, password, role, autoLogin = false }) => {
    setIsLoading(true);
    setError(null);
    try {
      // 1. Create account
      const newUser = await authApi.register({ name, email, password, role });
      if (autoLogin) {
        // 2. Automatically log in to issue tokens if explicitly opted in
        const loginRes = await authApi.login({ email, password });
        saveSession(loginRes.accessToken, loginRes.refreshToken, loginRes.user);
        return loginRes.user;
      }
      return newUser;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Logout handler
  const logout = async () => {
    try {
      if (accessToken) {
        await authApi.logout(accessToken, refreshToken);
      }
    } catch {
      // Continue client cleanup even if network request fails
    } finally {
      clearSession();
    }
  };

  // Update profile name handler
  const updateProfile = async (newName) => {
    if (!accessToken) throw new Error('Not authenticated');
    const updated = await authApi.updateMe(accessToken, { name: newName });
    setUser((prev) => ({ ...prev, ...updated }));
    return updated;
  };

  const value = {
    user,
    accessToken,
    isAuthenticated: Boolean(user && accessToken),
    isLoading,
    error,
    login,
    register,
    logout,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
