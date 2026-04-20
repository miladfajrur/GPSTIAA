import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
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
    const storedUser = sessionStorage.getItem("gpstiaa_user");
    if (storedUser) {
      setUser({ username: storedUser });
    }
  }, []);

  const login = useCallback((username: string) => {
    setUser({ username });
    sessionStorage.setItem("gpstiaa_user", username);
  }, []);

  const logout = useCallback(() => {
    setUser((currentUser) => {
      if (currentUser) {
        sessionStorage.removeItem(`greeted_${currentUser.username}`);
      }
      return null;
    });
    sessionStorage.removeItem("gpstiaa_user");
  }, []);

  // Auto logout setelah 15 menit tanpa aktivitas
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    const handleInactivityLogout = () => {
      if (sessionStorage.getItem("gpstiaa_user")) {
        logout();
      }
    };

    const resetTimer = () => {
      clearTimeout(timeoutId);
      // 15 menit = 15 * 60 * 1000 = 900.000 ms
      timeoutId = setTimeout(handleInactivityLogout, 900000);
    };

    if (user) {
      const events = ["mousemove", "mousedown", "keypress", "touchstart", "scroll", "click"];
      
      events.forEach(event => {
        window.addEventListener(event, resetTimer, true);
      });

      // Mulai timer
      resetTimer();

      return () => {
        clearTimeout(timeoutId);
        events.forEach(event => {
          window.removeEventListener(event, resetTimer, true);
        });
      };
    }
  }, [user, logout]);

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
