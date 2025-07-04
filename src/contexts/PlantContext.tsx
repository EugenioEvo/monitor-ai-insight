import React, { createContext, useContext, ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/services/logger';
import type { Plant } from '@/types';

interface PlantContextType {
  plants: Plant[];
  isLoading: boolean;
  error: Error | null;
  refetchPlants: () => void;
  invalidateQueries: () => void;
}

const PlantContext = createContext<PlantContextType | undefined>(undefined);

interface PlantProviderProps {
  children: ReactNode;
}

export const PlantProvider = ({ children }: PlantProviderProps) => {
  const queryClient = useQueryClient();

  // Query simplificada para plantas - sem integração com Zustand
  const { 
    data: plants = [], 
    isLoading, 
    error,
    refetch 
  } = useQuery({
    queryKey: ['plants'],
    queryFn: async () => {
      logger.info('Fetching plants from database', { component: 'PlantProvider' });
      
      const { data, error } = await supabase
        .from('plants')
        .select('*')
        .order('name');

      if (error) {
        logger.error('Failed to fetch plants', error, { component: 'PlantProvider' });
        throw error;
      }

      logger.info('Plants fetched successfully', { 
        component: 'PlantProvider',
        count: data.length 
      });
      
      return data as Plant[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
    retry: (failureCount, error) => {
      if (failureCount < 3) {
        logger.warn(`Retrying plants fetch (attempt ${failureCount + 1})`, { 
          component: 'PlantProvider',
          error: error.message 
        });
        return true;
      }
      return false;
    },
  });

  // Invalidar queries relacionadas a plantas
  const invalidateQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['plants'] });
    queryClient.invalidateQueries({ queryKey: ['sungrow'] });
    queryClient.invalidateQueries({ queryKey: ['readings'] });
    logger.info('Plant-related queries invalidated', { component: 'PlantProvider' });
  };

  const contextValue: PlantContextType = {
    plants,
    isLoading,
    error: error as Error | null,
    refetchPlants: refetch,
    invalidateQueries
  };

  return (
    <PlantContext.Provider value={contextValue}>
      {children}
    </PlantContext.Provider>
  );
};

export const usePlantContext = () => {
  const context = useContext(PlantContext);
  if (context === undefined) {
    throw new Error('usePlantContext must be used within a PlantProvider');
  }
  return context;
};

// Hook otimizado para plantas individuais
export const usePlant = (plantId: string) => {
  return useQuery({
    queryKey: ['plants', plantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plants')
        .select('*')
        .eq('id', plantId)
        .single();

      if (error) throw error;
      return data as Plant;
    },
    enabled: !!plantId,
    staleTime: 2 * 60 * 1000, // 2 minutos para planta individual
  });
};