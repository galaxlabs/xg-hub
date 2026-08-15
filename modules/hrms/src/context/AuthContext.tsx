import { createContext } from 'react';

export type UserRole = 'admin' | 'employee' | 'candidate' | null;

export interface User {
  name: string;
  email: string;
  role: UserRole;
  empId: string;
}

export interface AuthContextType {
  user: User | null;
  login: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  isLoading: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);