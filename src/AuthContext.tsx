import React, { createContext, useContext, useState, useEffect } from "react";
import { AuthUser } from "./types";

interface AuthContextType {
  user: AuthUser | null;
  login: (username: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("gpstiaa_user");
    if (storedUser) {
      setUser({ username: storedUser });
    }
  }, []);

  const login = (username: string) => {
    setUser({ username });
    localStorage.setItem("gpstiaa_user", username);
  };

  const logout = () => {
    if (user) {
      sessionStorage.removeItem(`greeted_${user.username}`);
    }
    setUser(null);
    localStorage.removeItem("gpstiaa_user");
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
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
