'use client';

import React, { createContext, useContext, useMemo, useState } from 'react';

export interface PosSidebarCategory {
  name: string;
  slug: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface PosSidebarValue {
  categories: PosSidebarCategory[];
  selected: string;
  setCategories: (categories: PosSidebarCategory[]) => void;
  setSelected: (slug: string) => void;
}

const PosSidebarContext = createContext<PosSidebarValue | null>(null);

/**
 * Lets the POS/cashier page hand its category list to AdminSidebar, which
 * renders on the opposite side of the layout tree. Owned by AdminLayout so
 * both the sidebar and the page it wraps can reach it.
 */
export function PosSidebarProvider({ children }: { children: React.ReactNode }) {
  const [categories, setCategories] = useState<PosSidebarCategory[]>([]);
  const [selected, setSelected] = useState('');

  const value = useMemo(
    () => ({ categories, selected, setCategories, setSelected }),
    [categories, selected]
  );

  return <PosSidebarContext.Provider value={value}>{children}</PosSidebarContext.Provider>;
}

export function usePosSidebar(): PosSidebarValue {
  const ctx = useContext(PosSidebarContext);
  if (!ctx) throw new Error('usePosSidebar must be used within a PosSidebarProvider');
  return ctx;
}
