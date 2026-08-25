"use client";
import { createContext, useContext } from "react";
import type { AuthProvider } from "@/lib/auth/provider";
const Context=createContext<AuthProvider>("supabase");
export const useAuthMode=()=>useContext(Context);
export function AppAuthContext({mode,children}:{mode:AuthProvider;children:React.ReactNode}){return <Context.Provider value={mode}>{children}</Context.Provider>}
