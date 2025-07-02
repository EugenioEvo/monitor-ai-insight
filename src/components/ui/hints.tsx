import React from 'react';
import { HelpCircle, Info, AlertTriangle, CheckCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';

interface HintProps {
  content: string;
  type?: 'info' | 'warning' | 'success' | 'help';
  placement?: 'top' | 'bottom' | 'left' | 'right';
  children?: React.ReactNode;
}

const HintIcons = {
  info: Info,
  warning: AlertTriangle,
  success: CheckCircle,
  help: HelpCircle
};

const HintColors = {
  info: 'text-blue-500',
  warning: 'text-yellow-500',
  success: 'text-green-500',
  help: 'text-gray-500'
};

export const Hint = ({ 
  content, 
  type = 'help', 
  placement = 'top',
  children 
}: HintProps) => {
  const Icon = HintIcons[type];
  const iconColor = HintColors[type];

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {children || (
            <Icon className={`h-4 w-4 cursor-help ${iconColor}`} />
          )}
        </TooltipTrigger>
        <TooltipContent side={placement}>
          <p className="text-sm max-w-xs">{content}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

// Hints específicos para campos comuns
export const SungrowHints = {
  AppKey: () => (
    <Hint 
      type="info"
      content="Obtida no portal Sungrow em Configurações > Aplicações. Necessária para autenticação da API."
    />
  ),
  
  AccessKey: () => (
    <Hint 
      type="info"
      content="Chave secreta para validação de requisições. Mantenha em segurança e não compartilhe."
    />
  ),

  PlantId: () => (
    <Hint 
      type="help"
      content="ID numérico da planta no sistema Sungrow. Pode ser encontrado na URL do portal ou obtido via descoberta automática."
    />
  ),

  BaseUrl: () => (
    <Hint 
      type="info"
      content="URL base da API Sungrow. Use o padrão para a região Asia-Pacífico ou ajuste conforme sua localização."
    />
  )
};

// Status badges para validação em tempo real
interface ValidationBadgeProps {
  status: 'pending' | 'validating' | 'valid' | 'invalid';
  message?: string;
}

export const ValidationBadge = ({ status, message }: ValidationBadgeProps) => {
  const variants = {
    pending: { variant: 'secondary' as const, text: 'Pendente' },
    validating: { variant: 'outline' as const, text: 'Validando...' },
    valid: { variant: 'default' as const, text: 'Válido' },
    invalid: { variant: 'destructive' as const, text: 'Inválido' }
  };

  const config = variants[status];

  return (
    <Badge variant={config.variant} className="text-xs">
      {config.text}
      {message && (
        <Hint content={message} type={status === 'valid' ? 'success' : 'warning'}>
          <span className="ml-1">ⓘ</span>
        </Hint>
      )}
    </Badge>
  );
};