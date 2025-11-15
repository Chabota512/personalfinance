
import { createContext, useContext, ReactNode, useState, useEffect } from "react";
import { fetchApi } from "@/lib/queryClient";

interface User {
  id: string;
  username: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check if user is already logged in on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetchApi('/api/auth/me');
        
        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (username: string, password: string) => {
    try {
      const response = await fetchApi('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password })
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Server error' }));
        throw new Error(error.error || `Login failed (${response.status})`);
      }

      const userData = await response.json();
      setUser(userData);
    } catch (error: any) {
      console.error('Login error:', error);
      if (error.message.includes('NetworkError') || error.message.includes('fetch')) {
        throw new Error('Network error. Please check your connection.');
      }
      throw error;
    }
  };

  const register = async (username: string, email: string, password: string) => {
    try {
      const response = await fetchApi('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ username, email, password })
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Server error' }));
        throw new Error(error.error || `Registration failed (${response.status})`);
      }

      const userData = await response.json();
      
      // Wait a bit for session to be fully established
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Verify the session is working by fetching user data
      const verifyResponse = await fetchApi('/api/auth/me');
      
      if (verifyResponse.ok) {
        const verifiedUser = await verifyResponse.json();
        setUser(verifiedUser);
      } else {
        console.error('Session verification failed after registration');
        // Fallback to the returned user data
        setUser(userData);
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      if (error.message.includes('NetworkError') || error.message.includes('fetch')) {
        throw new Error('Network error. Please check your connection.');
      }
      throw error;
    }
  };

  const logout = async () => {
    await fetchApi('/api/auth/logout', {
      method: 'POST'
    });
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
