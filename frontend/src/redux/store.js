import { configureStore } from '@reduxjs/toolkit';

import lang from '@/locale/translation/en_us';

import rootReducer from './rootReducer';
import storePersist from './storePersist';
import { ERP_INITIAL_STATE } from './erp/reducer';

// localStorageHealthCheck();

const AUTH_INITIAL_STATE = {
  current: {},
  isLoggedIn: false,
  isLoading: false,
  isSuccess: false,
};

const auth_state = storePersist.get('auth') ? storePersist.get('auth') : AUTH_INITIAL_STATE;

// Rehydrate currentProject only if valid (object with _id) to avoid corrupt localStorage breaking the app
const rawProject = storePersist.get('erpCurrentProject');
const erpCurrentProject =
  rawProject && typeof rawProject === 'object' && rawProject._id ? rawProject : null;

const initialState = {
  auth: auth_state,
  erp: { ...ERP_INITIAL_STATE, currentProject: erpCurrentProject },
};

/** Persist currentProject to localStorage (redux-persist style) when set/cleared */
const erpCurrentProjectPersistMiddleware = (store) => (next) => (action) => {
  const result = next(action);
  if (action.type === 'ERP_SET_CURRENT_PROJECT') {
    storePersist.set('erpCurrentProject', action.payload);
  }
  if (action.type === 'ERP_CLEAR_CURRENT_PROJECT' || action.type === 'ERP_RESET_STATE') {
    storePersist.remove('erpCurrentProject');
  }
  return result;
};

const store = configureStore({
  reducer: rootReducer,
  preloadedState: initialState,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(erpCurrentProjectPersistMiddleware),
  devTools: import.meta.env.PROD === false, // Enable Redux DevTools in development mode
});

console.log(
  '🚀 Welcome to IDURAR ERP CRM! Did you know that we also offer commercial customization services? Contact us at hello@idurarapp.com for more information.'
);

export default store;
