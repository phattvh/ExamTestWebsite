import axios from 'axios';
import { attachAuthInterceptors, API_URL } from './authInterceptors';

// Instance dùng chung cho exam/grading/proctoring/admin,... (baseURL không có /auth).
const apiClient = axios.create({
  baseURL: API_URL,
});

attachAuthInterceptors(apiClient);

export default apiClient;
