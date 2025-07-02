import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { Plant } from '@/types';
import { logger } from '@/services/logger';

interface SyncStatus {
  plantId: string;
  status: 'idle' | 'syncing' | 'success' | 'error';
  lastSync?: string;
  error?: string;
  retryCount: number;
}

interface AppState {
  // Plantas
  plants: Plant[];
  selectedPlant: Plant | null;
  
  // Sincronização
  syncStatuses: Record<string, SyncStatus>;
  globalSyncEnabled: boolean;
  
  // UI State
  loading: boolean;
  error: string | null;
  
  // Actions
  setPlants: (plants: Plant[]) => void;
  addPlant: (plant: Plant) => void;
  updatePlant: (id: string, updates: Partial<Plant>) => void;
  selectPlant: (plant: Plant | null) => void;
  
  // Sync Actions
  setSyncStatus: (plantId: string, status: Omit<SyncStatus, 'plantId'>) => void;
  startSync: (plantId: string) => void;
  completeSync: (plantId: string, success: boolean, error?: string) => void;
  setGlobalSyncEnabled: (enabled: boolean) => void;
  
  // UI Actions
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useAppStore = create<AppState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    plants: [],
    selectedPlant: null,
    syncStatuses: {},
    globalSyncEnabled: true,
    loading: false,
    error: null,

    // Plant actions
    setPlants: (plants) => {
      logger.info('Plants updated in store', { 
        component: 'AppStore',
        count: plants.length 
      });
      set({ plants });
    },

    addPlant: (plant) => {
      set((state) => ({ 
        plants: [...state.plants, plant] 
      }));
      logger.info('Plant added to store', { 
        component: 'AppStore',
        plantId: plant.id,
        plantName: plant.name 
      });
    },

    updatePlant: (id, updates) => {
      set((state) => ({
        plants: state.plants.map(plant => 
          plant.id === id ? { ...plant, ...updates } : plant
        ),
        selectedPlant: state.selectedPlant?.id === id 
          ? { ...state.selectedPlant, ...updates }
          : state.selectedPlant
      }));
      logger.info('Plant updated in store', { 
        component: 'AppStore',
        plantId: id,
        updates: Object.keys(updates)
      });
    },

    selectPlant: (plant) => {
      set({ selectedPlant: plant });
      logger.debug('Plant selected', { 
        component: 'AppStore',
        plantId: plant?.id 
      });
    },

    // Sync actions
    setSyncStatus: (plantId, status) => {
      set((state) => ({
        syncStatuses: {
          ...state.syncStatuses,
          [plantId]: { ...status, plantId }
        }
      }));
    },

    startSync: (plantId) => {
      const { setSyncStatus } = get();
      setSyncStatus(plantId, {
        status: 'syncing',
        retryCount: 0
      });
      logger.info('Sync started', { 
        component: 'AppStore',
        plantId 
      });
    },

    completeSync: (plantId, success, error) => {
      const { setSyncStatus, syncStatuses } = get();
      const currentStatus = syncStatuses[plantId];
      
      setSyncStatus(plantId, {
        status: success ? 'success' : 'error',
        lastSync: success ? new Date().toISOString() : currentStatus?.lastSync,
        error: success ? undefined : error,
        retryCount: success ? 0 : (currentStatus?.retryCount || 0) + 1
      });
      
      logger.info('Sync completed', { 
        component: 'AppStore',
        plantId,
        success,
        error 
      });
    },

    setGlobalSyncEnabled: (enabled) => {
      set({ globalSyncEnabled: enabled });
      logger.info('Global sync toggled', { 
        component: 'AppStore',
        enabled 
      });
    },

    // UI actions
    setLoading: (loading) => set({ loading }),
    setError: (error) => set({ error })
  }))
);

// Selectors para otimizar re-renders
export const usePlants = () => useAppStore(state => state.plants);
export const useSelectedPlant = () => useAppStore(state => state.selectedPlant);
export const useSyncStatuses = () => useAppStore(state => state.syncStatuses);
export const useGlobalSyncEnabled = () => useAppStore(state => state.globalSyncEnabled);

// Selector para plantas com status de sync
export const usePlantsWithSync = () => useAppStore(state => ({
  plants: state.plants.map(plant => ({
    ...plant,
    syncStatus: state.syncStatuses[plant.id] || {
      plantId: plant.id,
      status: 'idle' as const,
      retryCount: 0
    }
  }))
}));