
import { useToast } from '@/hooks/use-toast';
import type { Plant } from '@/types';

export class RetryHandler {
  private retryCount: number = 0;
  private readonly maxRetries: number = 3;
  private toast: ReturnType<typeof useToast>['toast'];

  constructor(toast: ReturnType<typeof useToast>['toast']) {
    this.toast = toast;
  }

  handleSyncError(plant: Plant, error: string): boolean {
    this.retryCount += 1;
    
    // Se excedeu o número máximo de tentativas, mostrar toast de erro
    if (this.retryCount >= this.maxRetries) {
      this.toast({
        title: "Erro na sincronização automática",
        description: `Planta ${plant.name}: ${error}`,
        variant: "destructive",
      });
      this.reset();
      return false; // Não deve tentar novamente
    }
    
    return true; // Pode tentar novamente
  }

  handleSyncSuccess(): void {
    this.reset();
  }

  reset(): void {
    this.retryCount = 0;
  }

  getRetryCount(): number {
    return this.retryCount;
  }

  getMaxRetries(): number {
    return this.maxRetries;
  }
}
