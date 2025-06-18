
import { useState } from "react";
import { Upload, FileText, Loader2, CheckCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export function InvoiceUpload() {
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const { toast } = useToast();

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    
    // Simular processamento com IA
    setTimeout(() => {
      setUploading(false);
      toast({
        title: "Fatura processada com sucesso!",
        description: `${files.length} arquivo(s) analisado(s) pela IA. Dados extraídos e salvos.`,
      });
    }, 3000);
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
                <h3 className="text-lg font-semibold text-gray-900">Processando com IA...</h3>
                <p className="text-gray-600">Extraindo dados da fatura automaticamente</p>
              </div>
            </>
          ) : (
            <>
              <Upload className="w-12 h-12 text-gray-400 mx-auto" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Carregar Faturas</h3>
                <p className="text-gray-600">Arraste arquivos PDF/ZIP ou clique para selecionar</p>
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
