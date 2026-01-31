import { Dataset, NormalizedData } from './dataset';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
  };
}

export interface DatasetsResponse {
  datasets: Dataset[];
  total: number;
  category?: string;
}

export interface DataResponse {
  dataset: Dataset;
  data: NormalizedData;
  cached: boolean;
}
