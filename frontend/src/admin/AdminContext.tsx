import { createContext, useContext } from "react";

import type { Backend } from "../lib/repo";
import type { Collection, Policy, Product } from "../types/api";

export type AdminData = {
  backend: Backend;
  products: Product[];
  collections: Collection[];
  policies: Policy[];
  reload(): Promise<void>;
  toast(message: string, tone?: "success" | "error"): void;
};

export const AdminContext = createContext<AdminData | null>(null);

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdmin must be used inside AdminContext");
  return ctx;
}
