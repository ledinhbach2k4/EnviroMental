import axios from 'axios';

// --- NETWORK CONNECTION FIX ---
// Issue: The mobile app (on an emulator/device) cannot connect to `localhost`.
// Solution: Use the local IP address of the machine running the backend server.
// Replace '192.168.1.10' with your IP address if it changes.
const API_BASE_URL = 'https://enviromental-app-api.onrender.com/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// An interceptor can be added to automatically attach the authentication token to every request
// api.interceptors.request.use(async (config) => {
//   const token = await someAsyncStorage.getItem('userToken');
//   if (token) {
//     config.headers.Authorization = `Bearer ${token}`;
//   }
//   return config;
// });

export default api;