import { createContext, useContext, useState, type ReactNode } from 'react';
import { useStore } from 'zustand';
import { createPoStore, type PoStore } from './create-po-store';

type PoStoreApi = ReturnType<typeof createPoStore>;

const PoStoreContext = createContext<PoStoreApi | null>(null);

export function PoProvider({ children }: { children: ReactNode }) {
  const [store] = useState(createPoStore);

  return <PoStoreContext.Provider value={store}>{children}</PoStoreContext.Provider>;
}

function usePoStoreContext() {
  const store = useContext(PoStoreContext);
  if (!store) throw new Error('usePoStore must be used within PoProvider');
  return store;
}

export function usePoStore<T>(selector: (state: PoStore) => T) {
  return useStore(usePoStoreContext(), selector);
}

export function usePoStoreApi() {
  return usePoStoreContext();
}
