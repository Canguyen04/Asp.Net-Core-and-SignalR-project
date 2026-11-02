// All business data comes from ASP.NET Core, not FastAPI/Render.
export const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/+$/, '');
export const HUB_URL = `${API_URL}/hubs/logistics`;
