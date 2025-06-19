
import { useState, useEffect } from "react";
import { Upload, FileText, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useSettings } from "@/hooks/useSettings";
import { supabase } from "@/integrations/supabase/client";

export function InvoiceUpload() {
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const { toast } = useToast();
  const { settings, loading: settingsLoading } = useSettings();

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    
    try {
      const ocrEngine = settings.invoices.ocrEngine;
      const autoValidation = settings.invoices.autoValidation;
      
      console.log(`Processando com engine: ${ocrEngine}, validação automática: ${autoValidation}`);
      
      // Simular upload e processamento
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Upload para o Storage do Supabase
        const fileName = `${Date.now()}-${file.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('invoices')
          .upload(fileName, file);

        if (uploadError) {
          console.error('Erro no upload:', uploadError);
          throw uploadError;
        }

        console.log(`Arquivo ${file.name} enviado com sucesso:`, uploadData.path);
      }
      
      // Simular tempo de processamento
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      toast({
        title: "Fatura processada com sucesso!",
        description: `${files.length} arquivo(s) analisado(s) com ${ocrEngine.toUpperCase()}. ${autoValidation ? 'Dados validados automaticamente.' : 'Validação manual necessária.'}`,
      });
    } catch (error) {
      console.error('Erro no processamento:', error);
      toast({
        title: "Erro no processamento",
        description: "Ocorreu um erro ao processar o arquivo.",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleFileUpload(e.dataTransfer.files);
  };

  if (settingsLoading) {
    return (
      <Card className="border-2 border-dashed border-gray-300">
        <CardContent className="p-8">
          <div className="text-center space-y-4">
            <Loader2 className="w-12 h-12 text-gray-400 mx-auto animate-spin" />
            <p className="text-gray-600">Carregando configurações...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-dashed border-gray-300 hover:border-blue-400 transition-colors">
      <CardContent className="p-8">
        <div
          className={`text-center space-y-4 ${dragActive ? 'bg-blue-50' : ''} rounded-lg p-6 transition-colors`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          {uploading ? (
            <>
              <Loader2 className="w-12 h-12 text-blue-500 mx-auto animate-spin" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Processando com {settings.invoices.ocrEngine.toUpperCase()}...
                </h3>
                <p className="text-gray-600">
                  {settings.invoices.autoValidation 
                    ? 'Extraindo e validando dados automaticamente' 
                    : 'Extraindo dados - validação manual necessária'
                  }
                </p>
              </div>
            </>
          ) : (
            <>
              <Upload className="w-12 h-12 text-gray-400 mx-auto" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Carregar Faturas</h3>
                <p className="text-gray-600">
                  Engine configurado: {settings.invoices.ocrEngine.toUpperCase()}
                </p>
                <p className="text-sm text-gray-500">
                  Arraste arquivos PDF/ZIP ou clique para selecionar
                </p>
              </div>
              <div className="flex gap-2 justify-center">
                <Button
                  onClick={() => document.getElementById('file-upload')?.click()}
                  className="bg-gradient-to-r from-blue-500 to-green-500 hover:from-blue-600 hover:to-green-600"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Selecionar Arquivos
                </Button>
              </div>
              <input
                id="file-upload"
                type="file"
                multiple
                accept=".pdf,.zip"
                className="hidden"
                onChange={(e) => handleFileUpload(e.target.files)}
              />
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
