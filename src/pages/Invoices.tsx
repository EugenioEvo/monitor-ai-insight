
import { FileText, Download, Eye, Upload, Brain, CheckCircle, Zap } from "lucide-react";
import { MultiEngineInvoiceUpload } from "@/components/invoices/MultiEngineInvoiceUpload";
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
          <h1 className="text-3xl font-bold text-gray-900">Multi-Engine OCR & IA - Sistema de Faturas</h1>
          <p className="text-gray-600">Processamento inteligente com OpenAI Vision + Google Vision + A/B Testing</p>
        </div>
      </div>

      <Tabs defaultValue="upload" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="upload">Upload & Processamento</TabsTrigger>
          <TabsTrigger value="processed">Faturas Processadas</TabsTrigger>
          <TabsTrigger value="analytics">Analytics & Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-6">
          <MultiEngineInvoiceUpload />
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
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Engine</th>
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
                          <Badge className="bg-purple-100 text-purple-800">
                            OpenAI
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
                    <p className="text-sm text-gray-600">Precisão Multi-Engine</p>
                    <p className="text-2xl font-bold text-green-600">99.5%</p>
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
                    <p className="text-sm text-gray-600">A/B Tests Executados</p>
                    <p className="text-2xl font-bold text-blue-600">247</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Zap className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Tempo Médio</p>
                    <p className="text-2xl font-bold text-purple-600">2.1s</p>
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
                    <p className="text-sm text-gray-600">Custo por Página</p>
                    <p className="text-2xl font-bold text-orange-600">$0.008</p>
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
                    <span className="font-medium">OpenAI Vision (GPT-4o)</span>
                    <div className="flex items-center gap-2">
                      <span className="text-green-600">99.5%</span>
                      <Badge className="bg-green-100 text-green-800">Principal</Badge>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Google Vision API</span>
                    <div className="flex items-center gap-2">
                      <span className="text-blue-600">97.8%</span>
                      <Badge variant="outline">Secundário</Badge>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Tesseract LSTM</span>
                    <div className="flex items-center gap-2">
                      <span className="text-orange-600">89.2%</span>
                      <Badge variant="outline">Em Desenvolvimento</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>A/B Testing Results</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">OpenAI vs Google Vision</span>
                    <Badge className="bg-purple-100 text-purple-800">OpenAI Wins: 78%</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Custo Médio por Engine</span>
                    <div className="text-sm">
                      <div>OpenAI: $0.015</div>
                      <div>Google: $0.005</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Tempo Médio de Processamento</span>
                    <div className="text-sm">
                      <div>OpenAI: 3.5s</div>
                      <div>Google: 2.0s</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Taxa de Fallback</span>
                    <Badge className="bg-yellow-100 text-yellow-800">5.2%</Badge>
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
