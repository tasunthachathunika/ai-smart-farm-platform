import { create } from 'zustand';
import { api, normalizeError } from '@/lib/api';
import { User, LoginCredentials, RegisterCredentials } from '@/types/auth';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;

  fetchMe: () => Promise<User | null>;
  login: (credentials: LoginCredentials) => Promise<User>;
  register: (credentials: RegisterCredentials) => Promise<User>;
  logout: () => Promise<void>;
  reset: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  isInitialized: false,
  error: null,

  fetchMe: async (): Promise<User | null> => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get<{ user: User }>('/auth/me');
      const user = response.data.user;
      set({
        user,
        isAuthenticated: true,
        isLoading: false,
        isInitialized: true,
        error: null,
      });
      return user;
    } catch {
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        isInitialized: true,
      });
      return null;
    }
  },

  login: async (credentials: LoginCredentials): Promise<User> => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post<{ user: User }>('/auth/login', credentials);
      const user = response.data.user;
      set({
        user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
      return user;
    } catch (err) {
      const apiErr = normalizeError(err);
      set({
        error: apiErr.message,
        isLoading: false,
      });
      throw apiErr;
    }
  },

  register: async (credentials: RegisterCredentials): Promise<User> => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post<{ user: User }>('/auth/register', credentials);
      const user = response.data.user;
      set({
        user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
      return user;
    } catch (err) {
      const apiErr = normalizeError(err);
      set({
        error: apiErr.message,
        isLoading: false,
      });
      throw apiErr;
    }
  },

  logout: async (): Promise<void> => {
    set({ isLoading: true });
    try {
      await api.post('/auth/logout');
    } catch {
      // Clean up local state regardless of server logout response
    } finally {
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    }
  },

  reset: () => {
    set({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
  },
}));
