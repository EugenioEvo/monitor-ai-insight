import React from 'react';
import { SimplifiedDigitalTwin } from './SimplifiedDigitalTwin';
import type { Plant } from '@/types';

interface SolarEdgeDigitalTwinProps {
  plant: Plant;
  equipmentData?: any[];
}

export const SolarEdgeDigitalTwin = ({ plant, equipmentData }: SolarEdgeDigitalTwinProps) => {
  return <SimplifiedDigitalTwin equipmentData={equipmentData || []} plant={plant} />;
};