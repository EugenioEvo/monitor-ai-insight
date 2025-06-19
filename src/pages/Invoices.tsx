
import { FileText, Download, Eye, Upload, Brain, CheckCircle } from "lucide-react";
import { EnhancedInvoiceUpload } from "@/components/invoices/EnhancedInvoiceUpload";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { mockInvoices } from "@/data/mockData";

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  processed: 'bg-green-100 text-green-800',
  error: 'bg-red-100 text-red-800'
};

const statusLabels = {
  pending: 'Pendente',
  processed: 'Processada',
  error: 'Erro'
};

export default function Invoices() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">OCR & IA - Sistema de Faturas</h1>
          <p className="text-gray-600">Processamento inteligente com múltiplos engines de OCR e validação automática</p>
        </div>
      </div>

      <Tabs defaultValue="upload" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="upload">Upload & Processamento</TabsTrigger>
          <TabsTrigger value="processed">Faturas Processadas</TabsTrigger>
          <TabsTrigger value="analytics">Analytics & KPIs</TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-6">
          <EnhancedInvoiceUpload />
        </TabsContent>

        <TabsContent value="processed" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-500" />
                Faturas Processadas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-medium text-gray-900">UC</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Referência</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Energia (kWh)</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Valor Total</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Status</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Confiança</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mockInvoices.map((invoice) => (
                      <tr key={invoice.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div className="font-medium">{invoice.uc_code}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div>{invoice.reference_month}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div>{invoice.energy_kwh.toLocaleString('pt-BR')}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium">
                            R$ {invoice.total_r$.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <Badge className={statusColors[invoice.status]}>
                            {statusLabels[invoice.status]}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <Badge className="bg-green-100 text-green-800">
                            98.5%
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm">
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Download className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Precisão Crítica</p>
                    <p className="text-2xl font-bold text-green-600">99.2%</p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Faturas Processadas</p>
                    <p className="text-2xl font-bold text-blue-600">1,247</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <FileText className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Tempo Médio</p>
                    <p className="text-2xl font-bold text-purple-600">2.8s</p>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Brain className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Taxa Revisão</p>
                    <p className="text-2xl font-bold text-orange-600">2.1%</p>
                  </div>
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                    <Eye className="w-6 h-6 text-orange-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Performance por Engine</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Google Vision API</span>
                    <div className="flex items-center gap-2">
                      <span className="text-green-600">99.5%</span>
                      <Badge className="bg-green-100 text-green-800">Principal</Badge>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">OpenAI GPT-4V</span>
                    <div className="flex items-center gap-2">
                      <span className="text-blue-600">97.8%</span>
                      <Badge variant="outline">Secundário</Badge>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Tesseract LSTM</span>
                    <div className="flex items-center gap-2">
                      <span className="text-orange-600">89.2%</span>
                      <Badge variant="outline">Fallback</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Validações Automáticas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Cross-field checks</span>
                    <Badge className="bg-green-100 text-green-800">Ativo</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Business rules</span>
                    <Badge className="bg-green-100 text-green-800">Ativo</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">ANEEL compliance</span>
                    <Badge className="bg-green-100 text-green-800">Ativo</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Anomaly detection</span>
                    <Badge className="bg-yellow-100 text-yellow-800">Beta</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
