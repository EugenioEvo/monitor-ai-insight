import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AnomaliesRealTimeDashboard } from '@/components/anomalies/AnomaliesRealTimeDashboard';
import { usePlantContext } from '@/contexts/PlantContext';
import { Building2 } from 'lucide-react';

export default function AnomaliesPage() {
  const { plants } = usePlantContext();
  const [selectedPlantId, setSelectedPlantId] = useState<string | null>(
    plants && plants.length > 0 ? plants[0].id : null
  );

  if (!plants || plants.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Nenhuma planta cadastrada</p>
            <p className="text-sm text-muted-foreground">
              Cadastre uma planta para começar a monitorar anomalias
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Selecione uma Planta
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedPlantId || undefined} onValueChange={setSelectedPlantId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecione uma planta" />
            </SelectTrigger>
            <SelectContent>
              {plants.map((plant) => (
                <SelectItem key={plant.id} value={plant.id}>
                  {plant.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedPlantId && <AnomaliesRealTimeDashboard plantId={selectedPlantId} />}
    </div>
  );
}
