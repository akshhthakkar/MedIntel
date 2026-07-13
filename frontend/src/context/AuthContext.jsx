import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Helper to execute OneSignal calls safely, catching both sync and async rejections
  const safeOneSignal = async (action) => {
    try {
      if (window.OneSignal && window.__oneSignalInitialized && typeof window.OneSignal.login === 'function') {
        await action(window.OneSignal);
      }
    } catch (osErr) {
      // silenced to prevent cluttering console when credentials/config are not fully set up
    }
  };

  useEffect(() => {
    const loadUser = async () => {
      if (token) {
        try {
          const res = await authAPI.me();
          if (res.data.success) {
            setUser(res.data.data.user);
            localStorage.setItem('user', JSON.stringify(res.data.data.user));
            
            // Tell OneSignal who this user is
            safeOneSignal(async (os) => {
              await os.login(res.data.data.user._id);
              if (res.data.data.user.email && os.User && typeof os.User.addEmail === 'function') {
                await os.User.addEmail(res.data.data.user.email);
              }
            });
          } else {
            handleLogout();
          }
        } catch (err) {
          console.error("Session restore failed:", err);
          handleLogout();
        }
      }
      setLoading(false);
    };

    loadUser();
  }, [token]);

  const handleLogin = async (email, password) => {
    setError(null);
    try {
      const res = await authAPI.login({ email, password });
      if (res.data.success) {
        const receivedToken = res.data.data?.token || res.data.token;
        const receivedUser = res.data.data?.user || res.data.user;
        setToken(receivedToken);
        setUser(receivedUser);
        localStorage.setItem('token', receivedToken);
        localStorage.setItem('user', JSON.stringify(receivedUser));
        
        // Link user to OneSignal
        safeOneSignal(async (os) => {
          await os.login(receivedUser._id);
          if (receivedUser.email && os.User && typeof os.User.addEmail === 'function') {
            await os.User.addEmail(receivedUser.email);
          }
        });
        
        return { success: true };
      }
      return { success: false, error: res.data.error || 'Login failed' };
    } catch (err) {
      let msg = err.response?.data?.error;
      if (!msg && err.response?.data?.errors) {
        msg = err.response.data.errors.map(e => e.message).join(', ');
      }
      if (!msg) {
        msg = 'Server error during login';
      }
      setError(msg);
      return { success: false, error: msg };
    }
  };

  const handleRegister = async (userData) => {
    setError(null);
    try {
      const res = await authAPI.register(userData);
      if (res.data.success) {
        const receivedToken = res.data.data?.token || res.data.token;
        const receivedUser = res.data.data?.user || res.data.user;
        setToken(receivedToken);
        setUser(receivedUser);
        localStorage.setItem('token', receivedToken);
        localStorage.setItem('user', JSON.stringify(receivedUser));

        // Link user to OneSignal
        safeOneSignal(async (os) => {
          await os.login(receivedUser._id);
          if (receivedUser.email && os.User && typeof os.User.addEmail === 'function') {
            await os.User.addEmail(receivedUser.email);
          }
        });

        return { success: true };
      }
      return { success: false, error: res.data.error || 'Registration failed' };
    } catch (err) {
      let msg = err.response?.data?.error;
      if (!msg && err.response?.data?.errors) {
        msg = err.response.data.errors.map(e => e.message).join(', ');
      }
      if (!msg) {
        msg = 'Server error during registration';
      }
      setError(msg);
      return { success: false, error: msg };
    }
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    safeOneSignal(async (os) => {
      if (typeof os.logout === 'function') {
        await os.logout();
      }
    });
  };

  const handleAccountDeletion = async () => {
    try {
      const res = await authAPI.deleteProfile();
      if (res.data.success) {
        handleLogout();
        return { success: true };
      }
      return { success: false, error: 'Failed to delete account' };
    } catch (err) {
      return { success: false, error: err.response?.data?.error || 'Server error' };
    }
  };

  const updateUser = async (updatedData) => {
    try {
      const res = await authAPI.updateProfile(updatedData);
      if (res.data.success) {
        const receivedUser = res.data.data?.user || res.data.user;
        setUser(receivedUser);
        localStorage.setItem('user', JSON.stringify(receivedUser));
        return { success: true };
      }
      return { success: false, error: 'Failed to update profile' };
    } catch (err) {
      return { success: false, error: err.response?.data?.error || 'Server error while updating profile' };
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      error,
      isAuthenticated: !!token && !!user,
      login: handleLogin,
      register: handleRegister,
      logout: handleLogout,
      deleteAccount: handleAccountDeletion,
      updateUser
    }}>
      {children}
    </AuthContext.Provider>
  );
};
