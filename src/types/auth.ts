import type { UserRole } from './database';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  displayName: string;
  avatar_url?: string | null;
}

export interface AuthSession {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  title: string;
  first_name: string;
  last_name: string;
  student_id?: string;
  phone?: string;
}
