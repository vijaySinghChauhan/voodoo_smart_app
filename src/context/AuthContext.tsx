import React, { createContext, useState, useEffect, useContext } from 'react';
import authService from '../services/auth/authService';

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  profilePicture?: string;
  role?: 'user' | 'admin';
  phone?: string;
  beta?: number | string | boolean;
  tester?: number | string | boolean;
  token?: string;
  subdeviceIds?: string[];
  subscriptionId?: string | null;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string, phone?: string, role?: 'user' | 'admin') => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (userData: Partial<User>) => Promise<void>;
  uploadAvatar: (uri: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    // Check if user is already logged in with a safety fallback for web
    let cancelled = false;
    const fallback = setTimeout(() => {
      if (!cancelled) {
        console.warn('[Auth] Fallback: clearing isLoading after timeout');
        setIsLoading(false);
      }
    }, 5000);

    const loadUser = async () => {
      try {
        const currentUser = await authService.getCurrentUser();
        setUser(currentUser);
      } catch (error) {
        console.error('Failed to load user:', error);
      } finally {
        clearTimeout(fallback);
        if (!cancelled) setIsLoading(false);
      }
    };

    loadUser();

    return () => {
      cancelled = true;
      clearTimeout(fallback);
    };
  }, []);
  
  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const loggedInUser = await authService.login(email, password);
      setUser(loggedInUser);
    } finally {
      setIsLoading(false);
    }
  };
  
  const signup = async (name: string, email: string, password: string, phone?: string, role: 'user' | 'admin' = 'user') => {
    setIsLoading(true);
    try {
      const newUser = await authService.signup(name, email, password, phone, role);
      setUser(newUser);
    } finally {
      setIsLoading(false);
    }
  };
  
  const logout = async () => {
    setIsLoading(true);
    try {
      await authService.logout();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };
  
  const updateProfile = async (userData: Partial<User>) => {
    setIsLoading(true);
    try {
      const updatedUser = await authService.updateProfile(userData);
      setUser(updatedUser);
    } finally {
      setIsLoading(false);
    }
  };
  
  const uploadAvatar = async (uri: string) => {
    setIsLoading(true);
    try {
      const updatedUser = await authService.uploadAvatar(uri);
      setUser(updatedUser);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <AuthContext.Provider value={{ user, isLoading, login, signup, logout, updateProfile, uploadAvatar }}>
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
