
import { AIAssistant } from "@/components/chat/AIAssistant";

export default function Chat() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Assistente Solar IA</h1>
        <p className="text-gray-600">Converse com nossa IA especializada em energia solar</p>
      </div>

      <div className="max-w-4xl">
        <AIAssistant />
      </div>
    </div>
  );
}
