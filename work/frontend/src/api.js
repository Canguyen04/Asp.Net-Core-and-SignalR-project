import axios from 'axios';
import { API_URL } from './config';
export const api = axios.create({ baseURL: `${API_URL}/api`, timeout: 15000 });
api.interceptors.request.use((request) => {
  let user;
  try { user = JSON.parse(localStorage.getItem('userInfo') || 'null'); } catch { user = null; }
  if (user?.access_token) request.headers.Authorization = `Bearer ${user.access_token}`;
  return request;
});
api.interceptors.response.use(response=>response, error=>{
  if(error?.response?.status===401 && !error.config?.url?.startsWith('/auth/')){
    localStorage.removeItem('userInfo');window.location.assign('/login');
  }
  return Promise.reject(error);
});
export const errorMessage = (err) => err?.response?.data?.detail || err?.message || 'Không thể kết nối tới Backend.';
export const currentUser = () => {
  try { return JSON.parse(localStorage.getItem('userInfo') || 'null'); } catch { return null; }
};
export const homeFor = (role) => role === 'admin' ? '/admin' : role?.startsWith('driver') ? '/driver' : '/guest';
