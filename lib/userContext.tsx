"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export interface AppUser {
  id: string;
  name: string;
  email: string;
  title: string | null;
  role: string;
  avatarUrl: string | null;
}

interface UserContextValue {
  currentUser: AppUser | null;
  users: AppUser[];
  setCurrentUser: (user: AppUser) => void;
  loading: boolean;
}

const UserContext = createContext<UserContextValue>({
  currentUser: null,
  users: [],
  setCurrentUser: () => {},
  loading: true,
});

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [currentUser, setCurrentUserState] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/users")
      .then((r) => r.json())
      .then((data: AppUser[]) => {
        setUsers(data);
        const savedId = localStorage.getItem("currentUserId");
        const saved = data.find((u) => u.id === savedId) ?? data[0] ?? null;
        setCurrentUserState(saved);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  function setCurrentUser(user: AppUser) {
    setCurrentUserState(user);
    localStorage.setItem("currentUserId", user.id);
  }

  return (
    <UserContext.Provider value={{ currentUser, users, setCurrentUser, loading }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}

export function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}
