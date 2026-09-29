import { createContext, useState, useEffect, type ReactNode } from 'react';
import axiosInstance from '../api/axios';

interface User {
  id: number;
  username: string;
  email: string;
  full_name: string | null;
  role: string;
}

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  login: (token: string, refresh: string) => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  login: () => {},
  logout: () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(localStorage.getItem('access_token'));
  
  const login = (token: string, refresh: string) => {
    localStorage.setItem('access_token', token);
    localStorage.setItem('refresh_token', refresh);
    setAccessToken(token);
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setAccessToken(null);
    setUser(null);
  };

  useEffect(() => {
    const fetchUser = async () => {
      if (accessToken) {
        try {
          const response = await axiosInstance.get('/me');
          setUser(response.data);
        } catch (error) {
          logout();
        }
      }
    };
    fetchUser();
  }, [accessToken]);

  const isAuthenticated = !!accessToken;

  return (
    <AuthContext.Provider value={{ user, accessToken, isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
