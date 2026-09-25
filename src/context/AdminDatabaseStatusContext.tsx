'use client';

import { createContext, useContext, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';

export type DatabaseStatus = 'checking' | 'connected' | 'disconnected';

const DatabaseStatusContext = createContext<DatabaseStatus>('checking');
const SetDatabaseStatusContext = createContext<Dispatch<SetStateAction<DatabaseStatus>>>(() => undefined);

export function AdminDatabaseStatusProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<DatabaseStatus>('checking');

  return <DatabaseStatusContext.Provider value={status}>
    <SetDatabaseStatusContext.Provider value={setStatus}>
      {children}
    </SetDatabaseStatusContext.Provider>
  </DatabaseStatusContext.Provider>;
}

export function useAdminDatabaseStatus() {
  return useContext(DatabaseStatusContext);
}

export function useSetAdminDatabaseStatus() {
  return useContext(SetDatabaseStatusContext);
}
