
import { AIAssistant } from "@/components/chat/AIAssistant";

export default function Chat() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
            <span className="text-lg font-bold text-primary-foreground">E</span>
          </div>
          EVO - Assistente Solar Inteligente
        </h1>
        <p className="text-muted-foreground">Sua inteligência artificial especializada em energia solar no Brasil</p>
      </div>

      <div className="max-w-4xl">
        <AIAssistant />
      </div>
    </div>
  );
}
