import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

import type { Host, Session } from '@/lib/types';

const HOSTS_KEY = '@tether/hosts';
const SESSIONS_KEY = '@tether/sessions';

const makeId = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

interface AppContextValue {
  hosts: Host[];
  sessions: Session[];
  addHost: (host: Omit<Host, 'id'>) => Promise<Host>;
  updateHost: (id: string, patch: Partial<Host>) => Promise<void>;
  deleteHost: (id: string) => Promise<void>;
  getSession: (id: string) => Session | undefined;
  upsertSession: (session: Session) => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
  sessionsForHost: (hostId: string) => Session[];
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [hosts, setHosts] = useState<Host[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [hostsRaw, sessionsRaw] = await Promise.all([
          AsyncStorage.getItem(HOSTS_KEY),
          AsyncStorage.getItem(SESSIONS_KEY),
        ]);
        if (hostsRaw) setHosts(JSON.parse(hostsRaw) as Host[]);
        if (sessionsRaw) setSessions(JSON.parse(sessionsRaw) as Session[]);
      } catch (_) {}
      setLoaded(true);
    })();
  }, []);

  const saveHosts = useCallback(async (updated: Host[]) => {
    setHosts(updated);
    await AsyncStorage.setItem(HOSTS_KEY, JSON.stringify(updated));
  }, []);

  const saveSessions = useCallback(async (updated: Session[]) => {
    setSessions(updated);
    await AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(updated));
  }, []);

  const addHost = useCallback(
    async (data: Omit<Host, 'id'>) => {
      const host: Host = { ...data, id: makeId() };
      await saveHosts([...hosts, host]);
      return host;
    },
    [hosts, saveHosts]
  );

  const updateHost = useCallback(
    async (id: string, patch: Partial<Host>) => {
      await saveHosts(hosts.map((h) => (h.id === id ? { ...h, ...patch } : h)));
    },
    [hosts, saveHosts]
  );

  const deleteHost = useCallback(
    async (id: string) => {
      await saveHosts(hosts.filter((h) => h.id !== id));
    },
    [hosts, saveHosts]
  );

  const getSession = useCallback(
    (id: string) => sessions.find((s) => s.id === id),
    [sessions]
  );

  const upsertSession = useCallback(
    async (session: Session) => {
      const existing = sessions.findIndex((s) => s.id === session.id);
      const updated =
        existing >= 0
          ? sessions.map((s) => (s.id === session.id ? session : s))
          : [...sessions, session];
      await saveSessions(updated);
    },
    [sessions, saveSessions]
  );

  const deleteSession = useCallback(
    async (id: string) => {
      await saveSessions(sessions.filter((s) => s.id !== id));
    },
    [sessions, saveSessions]
  );

  const sessionsForHost = useCallback(
    (hostId: string) =>
      sessions
        .filter((s) => s.hostId === hostId)
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ),
    [sessions]
  );

  if (!loaded) return null;

  return (
    <AppContext.Provider
      value={{
        hosts,
        sessions,
        addHost,
        updateHost,
        deleteHost,
        getSession,
        upsertSession,
        deleteSession,
        sessionsForHost,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
