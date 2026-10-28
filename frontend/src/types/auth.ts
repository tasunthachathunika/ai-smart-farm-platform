export type UserRole = 'farmer' | 'officer' | 'admin';

export interface User {
  id: string;
  email: string;
  fullName: string;
  phone?: string | null;
  role: UserRole;
  isVerified: boolean;
  isActive?: boolean;
  createdAt: string;
}

export interface AuthResponse {
  user: User;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  fullName: string;
  role: UserRole;
  phone?: string;
}
