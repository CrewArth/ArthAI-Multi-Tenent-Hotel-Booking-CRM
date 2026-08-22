import React, { createContext, useContext, useState, useEffect } from 'react';
import { saAuthApi } from '../api/saApi';

const SaAuthContext = createContext(null);

export const SaAuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('sa_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('sa_token') || null);
  const [loading, setLoading] = useState(false);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const res = await saAuthApi.login(email, password);
      const { token: jwtToken, user: saUser } = res.data;

      localStorage.setItem('sa_token', jwtToken);
      localStorage.setItem('sa_user', JSON.stringify(saUser));

      setToken(jwtToken);
      setUser(saUser);
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err.response?.data?.message || 'Login failed',
      };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('sa_token');
    localStorage.removeItem('sa_user');
    setToken(null);
    setUser(null);
  };

  return (
    <SaAuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </SaAuthContext.Provider>
  );
};

export const useSaAuth = () => useContext(SaAuthContext);
