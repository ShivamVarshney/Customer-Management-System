import axios from "axios";

const api = axios.create({
  baseURL: "https://customer-management-system-2.onrender.com/api",
  withCredentials: true,
});

export default api;