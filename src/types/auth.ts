export interface AuthResponse {
  isSuccess: boolean;
  message: string;
  token?: string | null;
  userId?: string | null;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
}

export interface AuthUser {
  userId: string;
  email: string;
}
