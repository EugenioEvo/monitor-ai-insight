
import { useState, useEffect, memo } from "react";
import { Upload, FileText, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useSettings } from "@/hooks/useSettings";
import { supabase } from "@/integrations/supabase/client";

interface InvoiceUploadProps {
  onUploadComplete?: (results: any[]) => void;
  maxFileSize?: number; // em MB
  acceptedFormats?: string[];
}

export const InvoiceUpload = memo(function InvoiceUpload({ 
  onUploadComplete,
  maxFileSize = 10,
  acceptedFormats = ['.pdf', '.zip', '.jpg', '.jpeg', '.png']
}: InvoiceUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { toast } = useToast();
  const { settings, loading: settingsLoading, error: settingsError } = useSettings();

  const validateFile = (file: File): string | null => {
    // Validar tamanho
    if (file.size > maxFileSize * 1024 * 1024) {
      return `Arquivo muito grande. Tamanho máximo: ${maxFileSize}MB`;
    }

    // Validar formato
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!acceptedFormats.includes(extension)) {
      return `Formato não suportado. Formatos aceitos: ${acceptedFormats.join(', ')}`;
    }

    return null;
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    // Validar arquivos
    const invalidFiles = Array.from(files).map(file => ({
      file,
      error: validateFile(file)
    })).filter(item => item.error);

    if (invalidFiles.length > 0) {
      toast({
        title: "Arquivos inválidos",
        description: invalidFiles.map(item => `${item.file.name}: ${item.error}`).join('\n'),
        variant: "destructive"
      });
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    const results = [];
    
    try {
      const ocrEngine = settings.invoices.ocrEngine;
      const autoValidation = settings.invoices.autoValidation;
      
      console.log(`Processando ${files.length} arquivo(s) com engine: ${ocrEngine}, validação automática: ${autoValidation}`);
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadProgress(Math.round((i / files.length) * 50)); // 50% para upload
        
        try {
          // Upload para o Storage do Supabase
          const fileName = `${Date.now()}-${file.name}`;
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('invoices')
            .upload(fileName, file, {
              cacheControl: '3600',
              upsert: false
            });

          if (uploadError) {
            console.error('Erro no upload:', uploadError);
            throw new Error(`Erro no upload de ${file.name}: ${uploadError.message}`);
          }

          console.log(`Arquivo ${file.name} enviado com sucesso:`, uploadData.path);
          
          results.push({
            fileName: file.name,
            filePath: uploadData.path,
            status: 'uploaded',
            size: file.size,
            type: file.type
          });
        } catch (fileError) {
          console.error(`Erro no arquivo ${file.name}:`, fileError);
          results.push({
            fileName: file.name,
            status: 'error',
            error: fileError.message
          });
        }
      }
      
      setUploadProgress(75);
      
      // Simular tempo de processamento
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setUploadProgress(100);
      
      const successCount = results.filter(r => r.status === 'uploaded').length;
      const errorCount = results.filter(r => r.status === 'error').length;
      
      if (successCount > 0) {
        toast({
          title: "Upload concluído!",
          description: `${successCount} arquivo(s) enviado(s) com sucesso. Engine: ${ocrEngine.toUpperCase()}. ${autoValidation ? 'Processamento automático iniciado.' : 'Validação manual necessária.'}`,
        });
      }
      
      if (errorCount > 0) {
        toast({
          title: "Alguns arquivos falharam",
          description: `${errorCount} arquivo(s) não puderam ser processados.`,
          variant: "destructive"
        });
      }
      
      onUploadComplete?.(results);
    } catch (error) {
      console.error('Erro no processamento:', error);
      toast({
        title: "Erro no processamento",
        description: "Ocorreu um erro ao processar os arquivos.",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
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

  if (settingsError) {
    return (
      <Card className="border-2 border-dashed border-red-300">
        <CardContent className="p-8">
          <div className="text-center space-y-4">
            <p className="text-red-600">Erro ao carregar configurações: {settingsError}</p>
            <Button onClick={() => window.location.reload()}>
              Tentar Novamente
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-dashed border-gray-300 hover:border-blue-400 transition-colors">
      <CardContent className="p-8">
        <div
          className={`text-center space-y-4 ${dragActive ? 'bg-blue-50 border-blue-300' : ''} rounded-lg p-6 transition-all duration-200`}
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
                {uploadProgress > 0 && (
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                )}
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
                  Arraste arquivos {acceptedFormats.join(', ')} ou clique para selecionar
                </p>
                <p className="text-xs text-gray-400">
                  Tamanho máximo: {maxFileSize}MB por arquivo
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
                accept={acceptedFormats.join(',')}
                className="hidden"
                onChange={(e) => handleFileUpload(e.target.files)}
              />
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
});
