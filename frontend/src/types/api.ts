export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: ApiError | null;
  request_id: string;
}

export interface ApiError {
  code: string;
  message: string;
  details: Array<{ field?: string; message: string }>;
}

export interface MessageResponse {
  message: string;
}
