// Расширение типов Axios для поддержки retry логики
import 'axios';

declare module 'axios' {
  export interface InternalAxiosRequestConfig {
    _retryCount?: number;
  }
}

