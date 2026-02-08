import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { auth } from '../lib/api';

interface AuthContextType {
  isAuthenticated: boolean;
  username: string | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('sagl_token');
    if (token) {
      auth
        .me()
        .then((data) => {
          setIsAuthenticated(true);
          setUsername(data.username);
        })
        .catch(() => {
          localStorage.removeItem('sagl_token');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (username: string, password: string) => {
    const data = await auth.login(username, password);
    localStorage.setItem('sagl_token', data.token);
    setIsAuthenticated(true);
    setUsername(data.username);
  };

  const logout = () => {
    localStorage.removeItem('sagl_token');
    setIsAuthenticated(false);
    setUsername(null);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, username, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth doit être utilisé dans un AuthProvider');
  }
  return context;
}
