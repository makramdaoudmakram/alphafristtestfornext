export interface MovParientItem {
  movParientId: number;
  movParientAname: string;
  movParientEname: string;
}

export interface CreateMovParientRequest {
  movParientAname: string;
  movParientEname: string;
}

export type UpdateMovParientRequest = CreateMovParientRequest;
