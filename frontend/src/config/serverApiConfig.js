// Backend base URL: use VITE_BACKEND_URL (preferred) or VITE_BACKEND_SERVER, with trailing slash.
// Production (Vercel): must set VITE_BACKEND_URL to your Render backend URL (e.g. https://your-app.onrender.com/).
const getBackendBase = () => {
  const url =
    import.meta.env.VITE_BACKEND_URL ||
    import.meta.env.VITE_BACKEND_SERVER ||
    '';
  return typeof url === 'string' && url ? url.replace(/\/?$/, '/') : '';
};

const isProductionOrRemote =
  import.meta.env.PROD || import.meta.env.VITE_DEV_REMOTE === 'remote';
const backendBase = isProductionOrRemote ? getBackendBase() : 'http://localhost:8888/';

export const API_BASE_URL = backendBase.endsWith('api/') ? backendBase : backendBase + 'api/';
export const BASE_URL = backendBase;

export const WEBSITE_URL = import.meta.env.PROD
  ? (import.meta.env.VITE_WEBSITE_URL || 'https://your-app.vercel.app/').replace(/\/?$/, '/')
  : 'http://localhost:3000/';

// Download route is at server root /download/, not under /api
export const DOWNLOAD_BASE_URL = isProductionOrRemote
  ? (getBackendBase() || backendBase).replace(/\/api\/?$/, '') + 'download/'
  : 'http://localhost:8888/download/';
export const ACCESS_TOKEN_NAME = 'x-auth-token';

export const FILE_BASE_URL = import.meta.env.VITE_FILE_BASE_URL || '';

//  console.log(
//    '🚀 Welcome to IDURAR ERP CRM! Did you know that we also offer commercial customization services? Contact us at hello@idurarapp.com for more information.'
//  );
