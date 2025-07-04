import React, { Suspense, useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Box, Sphere, Cylinder, Html } from '@react-three/drei';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Activity, Zap, Thermometer, Wifi, AlertTriangle } from 'lucide-react';
import { DigitalTwinErrorBoundary } from '@/components/ui/digital-twin-error-boundary';
import type { Plant } from '@/types';
import * as THREE from 'three';

interface SolarEdgeDigitalTwinProps {
  plant: Plant;
}

interface EquipmentData {
  id: string;
  name: string;
  type: 'inverter' | 'optimizer' | 'gateway';
  position: [number, number, number];
  status: 'online' | 'offline' | 'warning';
  power?: number;
  temperature?: number;
  voltage?: number;
  current?: number;
  efficiency?: number;
  signal?: number;
}

// Componente do Inversor 3D
const Inverter3D = ({ position, status, data }: { position: [number, number, number], status: string, data: EquipmentData }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (meshRef.current && status === 'online') {
      meshRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
    }
  });

  const color = status === 'online' ? '#22c55e' : status === 'warning' ? '#f59e0b' : '#ef4444';

  return (
    <group position={position}>
      <Box ref={meshRef} args={[2, 1, 1]} position={[0, 0.5, 0]}>
        <meshStandardMaterial color={color} />
      </Box>
      <Text
        position={[0, -0.8, 0]}
        fontSize={0.3}
        color="white"
        anchorX="center"
        anchorY="middle"
      >
        {data.name}
      </Text>
      <Html position={[0, 1.5, 0]} center>
        <div className="bg-background/80 backdrop-blur-sm border rounded-lg p-2 text-xs min-w-[120px]">
          <div className="font-medium">{data.power?.toFixed(1)} kW</div>
          <div className="text-muted-foreground">{data.temperature}°C</div>
          <div className="text-muted-foreground">{data.efficiency}% eff</div>
        </div>
      </Html>
    </group>
  );
};

// Componente do Otimizador 3D
const Optimizer3D = ({ position, status, data }: { position: [number, number, number], status: string, data: EquipmentData }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (meshRef.current && status === 'online') {
      meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2) * 0.1;
    }
  });

  const color = status === 'online' ? '#3b82f6' : status === 'warning' ? '#f59e0b' : '#ef4444';

  return (
    <group position={position}>
      <Cylinder ref={meshRef} args={[0.3, 0.3, 0.8]} position={[0, 0.4, 0]}>
        <meshStandardMaterial color={color} />
      </Cylinder>
      <Text
        position={[0, -0.5, 0]}
        fontSize={0.2}
        color="white"
        anchorX="center"
        anchorY="middle"
      >
        {data.name}
      </Text>
      <Html position={[0, 1, 0]} center>
        <div className="bg-background/80 backdrop-blur-sm border rounded-lg p-1 text-xs min-w-[100px]">
          <div className="text-muted-foreground">{data.voltage}V</div>
          <div className="text-muted-foreground">{data.current}A</div>
        </div>
      </Html>
    </group>
  );
};

// Componente do Gateway 3D
const Gateway3D = ({ position, status, data }: { position: [number, number, number], status: string, data: EquipmentData }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (meshRef.current && status === 'online') {
      meshRef.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 3) * 0.05);
    }
  });

  const color = status === 'online' ? '#8b5cf6' : status === 'warning' ? '#f59e0b' : '#ef4444';

  return (
    <group position={position}>
      <Sphere ref={meshRef} args={[0.4]} position={[0, 0.4, 0]}>
        <meshStandardMaterial color={color} />
      </Sphere>
      <Text
        position={[0, -0.3, 0]}
        fontSize={0.2}
        color="white"
        anchorX="center"
        anchorY="middle"
      >
        {data.name}
      </Text>
      <Html position={[0, 1, 0]} center>
        <div className="bg-background/80 backdrop-blur-sm border rounded-lg p-1 text-xs min-w-[80px]">
          <div className="flex items-center gap-1">
            <Wifi className="w-3 h-3" />
            {data.signal}%
          </div>
        </div>
      </Html>
    </group>
  );
};

// Componente principal da cena 3D
const Scene3D = ({ equipmentData }: { equipmentData: EquipmentData[] }) => {
  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <spotLight position={[0, 15, 0]} angle={0.3} penumbra={1} intensity={1} castShadow />
      
      {/* Plano base */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>

      {equipmentData.map((equipment) => {
        switch (equipment.type) {
          case 'inverter':
            return (
              <Inverter3D
                key={equipment.id}
                position={equipment.position}
                status={equipment.status}
                data={equipment}
              />
            );
          case 'optimizer':
            return (
              <Optimizer3D
                key={equipment.id}
                position={equipment.position}
                status={equipment.status}
                data={equipment}
              />
            );
          case 'gateway':
            return (
              <Gateway3D
                key={equipment.id}
                position={equipment.position}
                status={equipment.status}
                data={equipment}
              />
            );
          default:
            return null;
        }
      })}

      <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} />
    </>
  );
};

// Verificação de suporte WebGL
const checkWebGLSupport = (): boolean => {
  try {
    const canvas = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && canvas.getContext('webgl'));
  } catch (e) {
    return false;
  }
};

// Componente de fallback para quando 3D não funcionar
const FallbackView = ({ equipmentData }: { equipmentData: EquipmentData[] }) => (
  <Alert>
    <AlertTriangle className="h-4 w-4" />
    <AlertDescription>
      Visualização 3D não disponível. Mostrando dados dos equipamentos em formato tradicional.
    </AlertDescription>
  </Alert>
);

export const SolarEdgeDigitalTwin = ({ plant }: SolarEdgeDigitalTwinProps) => {
  const [webglSupported, setWebglSupported] = useState(true);

  useEffect(() => {
    setWebglSupported(checkWebGLSupport());
  }, []);

  // Mock data para demonstração - em implementação real viria da API SolarEdge
  const equipmentData = useMemo<EquipmentData[]>(() => [
    {
      id: 'inv-001',
      name: 'Inversor SE',
      type: 'inverter',
      position: [0, 0, 0],
      status: 'online',
      power: 5.2,
      temperature: 45,
      efficiency: 98.5
    },
    {
      id: 'opt-001',
      name: 'Opt 1',
      type: 'optimizer',
      position: [-3, 0, -2],
      status: 'online',
      voltage: 380,
      current: 8.5
    },
    {
      id: 'opt-002',
      name: 'Opt 2',
      type: 'optimizer',
      position: [-3, 0, 2],
      status: 'online',
      voltage: 375,
      current: 8.2
    },
    {
      id: 'opt-003',
      name: 'Opt 3',
      type: 'optimizer',
      position: [3, 0, -2],
      status: 'warning',
      voltage: 360,
      current: 7.8
    },
    {
      id: 'gw-001',
      name: 'Gateway',
      type: 'gateway',
      position: [3, 0, 2],
      status: 'online',
      signal: 95
    }
  ], []);

  const getTotalPower = () => equipmentData.reduce((sum, eq) => sum + (eq.power || 0), 0);
  const getOnlineCount = () => equipmentData.filter(eq => eq.status === 'online').length;
  const getWarningCount = () => equipmentData.filter(eq => eq.status === 'warning').length;

  return (
    <div className="space-y-6">
      {/* Header com informações gerais */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Digital Twin - SolarEdge
          </CardTitle>
          <CardDescription>
            Visualização 3D em tempo real dos equipamentos da planta {plant.name}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{getTotalPower().toFixed(1)} kW</div>
              <div className="text-sm text-muted-foreground">Potência Total</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{getOnlineCount()}</div>
              <div className="text-sm text-muted-foreground">Online</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{getWarningCount()}</div>
              <div className="text-sm text-muted-foreground">Alertas</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{equipmentData.length}</div>
              <div className="text-sm text-muted-foreground">Total</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Visualização 3D */}
      <Card>
        <CardHeader>
          <CardTitle>Visualização 3D dos Equipamentos</CardTitle>
          <CardDescription>
            {webglSupported ? 
              'Interaja com a cena: clique e arraste para rotacionar, scroll para zoom' :
              'WebGL não suportado pelo navegador'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {webglSupported ? (
            <DigitalTwinErrorBoundary>
              <div className="h-[500px] bg-gradient-to-b from-slate-900 to-slate-800 rounded-lg overflow-hidden">
                <Canvas 
                  shadows 
                  camera={{ position: [8, 8, 8], fov: 60 }}
                  onCreated={({ gl }) => {
                    gl.setSize(gl.domElement.clientWidth, gl.domElement.clientHeight, false);
                  }}
                  fallback={<FallbackView equipmentData={equipmentData} />}
                >
                  <Suspense fallback={null}>
                    <Scene3D equipmentData={equipmentData} />
                  </Suspense>
                </Canvas>
              </div>
            </DigitalTwinErrorBoundary>
          ) : (
            <FallbackView equipmentData={equipmentData} />
          )}
        </CardContent>
      </Card>

      {/* Lista detalhada dos equipamentos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {equipmentData.map((equipment) => (
          <Card key={equipment.id} className="border-l-4" style={{
            borderLeftColor: equipment.status === 'online' ? '#22c55e' : 
                           equipment.status === 'warning' ? '#f59e0b' : '#ef4444'
          }}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{equipment.name}</CardTitle>
                <Badge variant={equipment.status === 'online' ? 'default' : 
                              equipment.status === 'warning' ? 'outline' : 'destructive'}>
                  {equipment.status === 'online' ? 'Online' : 
                   equipment.status === 'warning' ? 'Alerta' : 'Offline'}
                </Badge>
              </div>
              <CardDescription>
                {equipment.type === 'inverter' ? 'Inversor' :
                 equipment.type === 'optimizer' ? 'Otimizador' : 'Gateway'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {equipment.type === 'inverter' && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Potência</span>
                    <span className="font-medium">{equipment.power} kW</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <Thermometer className="w-3 h-3" />
                      Temperatura
                    </span>
                    <span className="font-medium">{equipment.temperature}°C</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Eficiência</span>
                    <span className="font-medium">{equipment.efficiency}%</span>
                  </div>
                </>
              )}
              
              {equipment.type === 'optimizer' && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <Zap className="w-3 h-3" />
                      Tensão
                    </span>
                    <span className="font-medium">{equipment.voltage} V</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Corrente</span>
                    <span className="font-medium">{equipment.current} A</span>
                  </div>
                </>
              )}
              
              {equipment.type === 'gateway' && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Wifi className="w-3 h-3" />
                    Sinal
                  </span>
                  <span className="font-medium">{equipment.signal}%</span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Info sobre o Digital Twin */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-blue-700">Digital Twin SolarEdge</CardTitle>
          <CardDescription className="text-blue-600">
            Representação digital em 3D dos equipamentos da planta com dados em tempo real.
            A visualização mostra inversores, otimizadores e gateway com suas métricas atuais.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
};