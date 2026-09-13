import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";

import { api } from "../api/client";
import type { User } from "../api/client";

const TOKEN_KEY = "retail.token";
const USER_KEY = "retail.user";

export interface AuthContextValue {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<User>;
  register: (email: string, password: string) => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readStoredUser(): User | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

function persistAuth(token: string | null, user: User | null): void {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
  if (user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(USER_KEY);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(readStoredUser);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));

  const setAuth = (nextToken: string | null, nextUser: User | null) => {
    persistAuth(nextToken, nextUser);
    setToken(nextToken);
    setUser(nextUser);
  };

  const login = async (email: string, password: string) => {
    const response = await api.login(email, password);
    setAuth(response.access_token, null);
    const current = await api.me();
    setAuth(response.access_token, current);
    return current;
  };

  const register = async (email: string, password: string) => {
    await api.register(email, password);
    return login(email, password);
  };

  const logout = () => {
    setAuth(null, null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}