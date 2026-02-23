import * as actionTypes from './types';

const INITIAL_STATE = {
  currentProject: null, // Persisted via storePersist (redux-persist style); used for project-scoped workflow
  current: {
    result: null,
  },
  list: {
    result: {
      items: [],
      pagination: {
        current: 1,
        pageSize: 10,
        showSizeChanger: false,
        total: 1,
      },
    },
    isLoading: false,
    isSuccess: false,
  },
  create: {
    result: null,
    current: null,
    isLoading: false,
    isSuccess: false,
  },
  update: {
    result: null,
    current: null,
    isLoading: false,
    isSuccess: false,
  },
  delete: {
    result: null,
    current: null,
    isLoading: false,
    isSuccess: false,
  },
  read: {
    result: null,
    current: null,
    isLoading: false,
    isSuccess: false,
  },
  recordPayment: {
    result: null,
    current: null,
    isLoading: false,
    isSuccess: false,
  },
  search: {
    result: [],
    current: null,
    isLoading: false,
    isSuccess: false,
  },
  summary: {
    result: null,
    current: null,
    isLoading: false,
    isSuccess: false,
  },
  mail: {
    result: null,
    current: null,
    isLoading: false,
    isSuccess: false,
  },
};

export { INITIAL_STATE as ERP_INITIAL_STATE };

const erpReducer = (state = INITIAL_STATE, action) => {
  const { payload, keyState } = action;

  switch (action.type) {
    case actionTypes.RESET_STATE:
      return INITIAL_STATE;
    case actionTypes.SET_CURRENT_PROJECT:
      return {
        ...state,
        currentProject: payload,
      };
    case actionTypes.CLEAR_CURRENT_PROJECT:
      return {
        ...state,
        currentProject: null,
      };
    case actionTypes.CURRENT_ITEM:
      return {
        ...state,
        current: {
          result: payload,
        },
      };
    case actionTypes.REQUEST_LOADING:
      return {
        ...state,
        [keyState]: {
          ...state[keyState],
          isLoading: true,
        },
      };
    case actionTypes.REQUEST_FAILED:
      return {
        ...state,
        [keyState]: {
          ...state[keyState],
          isLoading: false,
          isSuccess: false,
        },
      };
    case actionTypes.REQUEST_SUCCESS:
      return {
        ...state,
        [keyState]: {
          result: payload,
          isLoading: false,
          isSuccess: true,
        },
      };
    case actionTypes.CURRENT_ACTION:
      return {
        ...state,
        [keyState]: {
          ...state[keyState],
          current: payload,
        },
      };
    case actionTypes.RESET_ACTION:
      return {
        ...state,
        [keyState]: {
          ...INITIAL_STATE[keyState],
        },
      };
    default:
      return state;
  }
};

export default erpReducer;
