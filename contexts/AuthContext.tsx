"use client"
import React, { createContext, useState, useContext, useEffect } from 'react';
import { logger } from '@/lib/logger';

interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for stored user in localStorage on initial load
    try {
      const storedUser = localStorage.getItem('adminUser');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      logger.error("Error retrieving stored user", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);

    // Mock authentication - in a real app, this would be an API call
    return new Promise((resolve) => {
      setTimeout(() => {
        try {
          // Demo credentials - in real app would validate against backend
          if (email === 'admin@example.com' && password === 'password') {
            const userData = { id: '1', email, name: 'Admin User' };
            setUser(userData);
            localStorage.setItem('adminUser', JSON.stringify(userData));
            resolve(true);
          } else {
            resolve(false);
          }
        } catch (error) {
          logger.error("Login error", error);
          resolve(false);
        } finally {
          setIsLoading(false);
        }
      }, 1000); // Simulate network request
    });
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('adminUser');
  };

  const value = {
    user,
    // isAuthenticated: !!user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
