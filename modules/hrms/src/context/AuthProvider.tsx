import React, { useState, useEffect } from 'react';
import { AuthContext } from './AuthContext';
import { loginAuth } from '../api';

export const AuthProvider = ({ children }: any) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('hrms_session');
    if (stored) {
      const parsed = JSON.parse(stored);
      setUser(parsed.user);
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, pass: string, deviceId?: string) => {
    try {
      const res = await loginAuth(email, pass, deviceId);

      if (res?.token && res?.user) {
        setUser(res.user);
        localStorage.setItem('hrms_session', JSON.stringify(res));
        return { success: true };
      }
      return { success: false, error: 'Login failed' };
    } catch (err: any) {
      console.error('Login error in AuthProvider:', err);
      return { success: false, error: err.message || 'Login failed' };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('hrms_session');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};