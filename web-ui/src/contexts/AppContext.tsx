/**
 * Application Context
 * 
 * This context provides global state management for the Universal API Schema Explorer.
 * It manages schemas, application settings, and system status across the entire app.
 */

import { createContext, useContext, useReducer, useEffect, type ReactNode } from 'react';
import { apiService, type SchemaListResponse } from '../services/api';

interface Schema {
  id: string;
  name: string;
  protocol: string;
  version: string;
  operations: number;
  types: number;
  discoveredAt: string;
  description?: string;
  baseUrl?: string;
  source: string;
}

interface SystemStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  protocols: Record<string, boolean>;
  storage: {
    type: string;
    available: boolean;
    schemaCount: number;
  };
  version: string;
}

interface AppState {
  schemas: Schema[];
  systemStatus: SystemStatus | null;
  loading: {
    schemas: boolean;
    status: boolean;
  };
  error: string | null;
  filters: {
    protocol: string;
    search: string;
  };
}

type AppAction =
  | { type: 'SET_SCHEMAS'; payload: Schema[] }
  | { type: 'ADD_SCHEMA'; payload: Schema }
  | { type: 'REMOVE_SCHEMA'; payload: string }
  | { type: 'SET_SYSTEM_STATUS'; payload: SystemStatus }
  | { type: 'SET_LOADING'; payload: { key: keyof AppState['loading']; value: boolean } }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_FILTERS'; payload: Partial<AppState['filters']> }
  | { type: 'CLEAR_ERROR' };

const initialState: AppState = {
  schemas: [],
  systemStatus: null,
  loading: {
    schemas: false,
    status: false,
  },
  error: null,
  filters: {
    protocol: 'all',
    search: '',
  },
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_SCHEMAS':
      return { ...state, schemas: action.payload };
    
    case 'ADD_SCHEMA':
      return { ...state, schemas: [...state.schemas, action.payload] };
    
    case 'REMOVE_SCHEMA':
      return { ...state, schemas: state.schemas.filter(s => s.id !== action.payload) };
    
    case 'SET_SYSTEM_STATUS':
      return { ...state, systemStatus: action.payload };
    
    case 'SET_LOADING':
      return { 
        ...state, 
        loading: { ...state.loading, [action.payload.key]: action.payload.value } 
      };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    
    case 'SET_FILTERS':
      return { ...state, filters: { ...state.filters, ...action.payload } };
    
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    
    default:
      return state;
  }
}

interface AppContextType {
  state: AppState;
  actions: {
    loadSchemas: () => Promise<void>;
    loadSystemStatus: () => Promise<void>;
    deleteSchema: (id: string) => Promise<boolean>;
    setFilters: (filters: Partial<AppState['filters']>) => void;
    clearError: () => void;
    refreshData: () => Promise<void>;
  };
}

const AppContext = createContext<AppContextType | undefined>(undefined);

interface AppProviderProps {
  children: ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  const loadSchemas = async (customFilters?: { protocol?: string; search?: string }) => {
    dispatch({ type: 'SET_LOADING', payload: { key: 'schemas', value: true } });
    dispatch({ type: 'CLEAR_ERROR' });

    try {
      // Use provided filters or current state filters
      const filtersToUse = customFilters || state.filters;
      const apiFilters = filtersToUse.protocol !== 'all' ? { protocol: filtersToUse.protocol } : undefined;

      const response: SchemaListResponse = await apiService.getSchemas({
        ...apiFilters,
        search: filtersToUse.search || undefined,
      });

      dispatch({ type: 'SET_SCHEMAS', payload: response.schemas });
    } catch (error) {
      console.error('Failed to load schemas:', error);
      dispatch({
        type: 'SET_ERROR',
        payload: error instanceof Error ? error.message : 'Failed to load schemas'
      });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: { key: 'schemas', value: false } });
    }
  };

  const loadSystemStatus = async () => {
    dispatch({ type: 'SET_LOADING', payload: { key: 'status', value: true } });
    
    try {
      const status = await apiService.getStatus();
      dispatch({ type: 'SET_SYSTEM_STATUS', payload: status });
    } catch (error) {
      console.error('Failed to load system status:', error);
      // Don't set error for status failures as it's not critical
    } finally {
      dispatch({ type: 'SET_LOADING', payload: { key: 'status', value: false } });
    }
  };

  const deleteSchema = async (id: string): Promise<boolean> => {
    try {
      const success = await apiService.deleteSchema(id);
      if (success) {
        dispatch({ type: 'REMOVE_SCHEMA', payload: id });
      }
      return success;
    } catch (error) {
      dispatch({ 
        type: 'SET_ERROR', 
        payload: error instanceof Error ? error.message : 'Failed to delete schema' 
      });
      return false;
    }
  };

  const setFilters = (filters: Partial<AppState['filters']>) => {
    dispatch({ type: 'SET_FILTERS', payload: filters });
  };

  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  const refreshData = async () => {
    await Promise.all([loadSchemas(), loadSystemStatus()]);
  };

  // Load initial data
  useEffect(() => {
    refreshData();
  }, []);

  // Reload schemas when filters change (with dependency array to prevent loops)
  useEffect(() => {
    loadSchemas();
  }, [state.filters.protocol, state.filters.search]); // Only depend on actual filter values

  const contextValue: AppContextType = {
    state,
    actions: {
      loadSchemas,
      loadSystemStatus,
      deleteSchema,
      setFilters,
      clearError,
      refreshData,
    },
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

export type { Schema, SystemStatus, AppState };
