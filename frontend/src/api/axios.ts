import axios from 'axios';
import { attachAuthInterceptors, API_URL } from './authInterceptors';

// Instance riêng cho các call auth (/me, ...), có sẵn tiền tố /auth.
const axiosInstance = axios.create({
  baseURL: `${API_URL}/auth`, // Proxy through API Gateway (Nginx)
});

attachAuthInterceptors(axiosInstance);

export default axiosInstance;
