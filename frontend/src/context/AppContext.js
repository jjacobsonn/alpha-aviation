import _checkPropTypes from 'prop-types/checkPropTypes';
import React, { createContext, useReducer, useEffect, useContext } from 'react';
import { PropTypes } from 'prop-types';
import { makeApiRequest } from '../shared/Api';

const AppContext = createContext(null);

const initialState = {
  initialized: false,
  isInitializing: false,
  isLoggingIn: false,
  accessToken: localStorage.getItem('accessToken'),
  refreshToken: localStorage.getItem('refreshToken'),
  isAuthenticated: !!localStorage.getItem('accessToken'),
  pageTitle: '',
  siteAlerts: [],
  user: {},
  monthStats: {
    jobsCompletedMonth: 0,
    revisionCountMonth: 0,
    previousShiftHours: 0.0,
    currentShiftStart: null
  }
};

export const ACTION_TYPES = {
  INITIALIZING: 'INITIALIZING',
  INIT_COMPLETE: 'INIT_COMPLETE',
  LOGGING_IN: 'LOGGING_IN',
  LOGIN_ERROR: 'LOGIN_ERROR',
  LOGGED_IN: 'LOGGED_IN',
  LOGGED_OUT: 'LOGGED_OUT',
  SET_PAGE_TITLE: 'SET_PAGE_TITLE',
  UPDATE_SITE_ALERTS: 'UPDATE_SITE_ALERTS',
  UPDATE_USER: 'UPDATE_USER'
};

const reducer = (state, action) => {
  switch (action.type) {
    case ACTION_TYPES.INITIALIZING:
      return {
        ...state,
        initialized: false,
        isInitializing: true
      };
    case ACTION_TYPES.INIT_COMPLETE:
      return {
        ...state,
        initialized: true,
        isInitializing: false
      };
    case ACTION_TYPES.LOGGING_IN:
      return {
        ...state,
        isLoggingIn: true
      };
    case ACTION_TYPES.LOGIN_ERROR:
      return {
        ...state,
        isAuthenticated: false,
        isLoggingIn: false,
        accessToken: null,
        refreshToken: null,
        user: {}
      };
    case ACTION_TYPES.LOGGED_IN:
      return {
        ...state,
        isLoggingIn: false,
        isAuthenticated: true,
        accessToken: action.payload.accessToken,
        refreshToken: action.payload.refreshToken
      };
    case ACTION_TYPES.LOGGED_OUT:
      return {
        ...state,
        isAuthenticated: false,
        accessToken: null,
        refreshToken: null,
        pageTitle: '',
        siteAlerts: [],
        user: {},
        monthStats: {
          jobsCompletedMonth: 0,
          revisionCountMonth: 0,
          previousShiftHours: 0.0,
          currentShiftStart: null
        }
      };
    case ACTION_TYPES.SET_PAGE_TITLE:
      return {
        ...state,
        pageTitle: action.payload.pageTitle
      };
    case ACTION_TYPES.UPDATE_SITE_ALERTS:
      return {
        ...state,
        siteAlerts: action.payload
      };
    case ACTION_TYPES.UPDATE_USER: {
      // Backend /api/users/me/ returns:
      // { id, username, email, first_name, last_name, company_role, company, company_name }
      const userObject = action.payload.user || action.payload;
      return {
        ...state,
        user: {
          id: userObject.id ?? state.user.id,
          email: userObject.email ?? state.user.email,
          username: userObject.username ?? state.user.username,
          firstName: userObject.first_name ?? state.user.firstName,
          lastName: userObject.last_name ?? state.user.lastName,
          role: userObject.company_role ?? state.user.role,
          isStaff: userObject.is_staff ?? state.user.isStaff,
          isSuperuser: userObject.is_superuser ?? state.user.isSuperuser,
          companyId: userObject.company ?? state.user.companyId,
          companyName: userObject.company_name ?? state.user.companyName,
        },
        // monthStats are not used in the current UI; keep them unchanged
        monthStats: state.monthStats
      };
    }
    default:
      return state;
  }
};

const AppProvider = ({ children }) => {
  _checkPropTypes(
    {
      children: PropTypes.object.isRequired
    },
    {
      children
    },
    'prop',
    'AppProvider'
  );

  const [state, dispatch] = useReducer(reducer, initialState);
  const value = { state, dispatch };

  useEffect(() => {
    const accessToken = localStorage.getItem('accessToken');
    const refreshToken = localStorage.getItem('refreshToken');
    
    if (accessToken && refreshToken) {
      dispatch({
        type: ACTION_TYPES.INITIALIZING
      });
      
      makeApiRequest('GET', '/users/me/')
        .then((userData) => {
          dispatch({
            type: ACTION_TYPES.UPDATE_USER,
            payload: userData
          });
          dispatch({
            type: ACTION_TYPES.LOGGED_IN,
            payload: {
              accessToken,
              refreshToken
            }
          });
        })
        .catch((error) => {
          console.error('Failed to validate token:', error);
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          dispatch({
            type: ACTION_TYPES.LOGIN_ERROR
          });
        })
        .finally(() => {
          dispatch({
            type: ACTION_TYPES.INIT_COMPLETE
          });
        });
    } else {
      dispatch({
        type: ACTION_TYPES.INIT_COMPLETE
      });
    }
  }, []);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};

export { AppContext, AppProvider };
