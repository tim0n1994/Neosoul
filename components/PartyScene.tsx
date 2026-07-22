'use client';

import { Canvas } from '@react-three/fiber';
import { Environment } from '@react-three/drei';
import { useParticipants } from '@livekit/components-react';
import { AvatarOrb } from '@/components/AvatarOrb';
import { Suspense, useMemo } from 'react';

const THEME_COLOR = '#c47b78'; // 暧昧玫瑰金，匹配暖色系
const INNER_R = 1.6; // 上麦者内圈半径
const OUTER_R = 3.2; // 听众外圈半径

type Meta = {
  style?: string;
  seed?: string;
  isHost?: boolean;
};

function parseMeta(raw: string | undefined): Meta {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Meta;
  } catch {
    return {};
  }
}

function ringPosition(index: number, total: number, radius: number): [number, number, number] {
  const angle = (index / Math.max(total, 1)) * Math.PI * 2;
  return [Math.cos(angle) * radius, 0, Math.sin(angle) * radius];
}

function SceneContent() {
  const participants = useParticipants();

  // 上麦者（canPublish）排内圈，听众排外圈
  const { speakers, listeners } = useMemo(() => {
    const speakers: typeof participants = [];
    const listeners: typeof participants = [];
    participants.forEach((p) => {
      if (p.permissions?.canPublish) speakers.push(p);
      else listeners.push(p);
    });
    return { speakers, listeners };
  }, [participants]);

  return (
    <>
      {/* 三点光照——让虹彩和 clearcoat 有反射 */}
      <ambientLight intensity={0.3} />
      <directionalLight position={[3, 5, 2]} intensity={0.6} color="#f5efe9" />
      <pointLight position={[-3, 2, -2]} intensity={0.4} color="#c47b78" />
      <pointLight position={[0, -2, 3]} intensity={0.2} color="#b89968" />
      {/* 环境贴图——让 MeshPhysicalMaterial 的 iridescence/clearcoat 有反射环境 */}
      <Environment preset="night" />

      {speakers.map((p, i) => {
        const meta = parseMeta(p.metadata);
        return (
          <AvatarOrb
            key={p.identity}
            position={ringPosition(i, speakers.length, INNER_R)}
            participant={p}
            name={p.name ?? 'Guest'}
            style={meta.style ?? 'thumbs'}
            seed={meta.seed ?? p.identity}
            isOnMic={true}
            themeColor={THEME_COLOR}
          />
        );
      })}

      {listeners.map((p, i) => {
        const meta = parseMeta(p.metadata);
        return (
          <AvatarOrb
            key={p.identity}
            position={ringPosition(i, listeners.length, OUTER_R)}
            participant={p}
            name={p.name ?? 'Guest'}
            style={meta.style ?? 'thumbs'}
            seed={meta.seed ?? p.identity}
            isOnMic={false}
            themeColor={THEME_COLOR}
          />
        );
      })}
    </>
  );
}

// R3F Canvas：深色背景 + 雾，camera 俯视（PRD §11.2）
export function PartyScene() {
  return (
    <div style={{ width: '100%', height: '100%', minHeight: '100%' }}>
      <Canvas
        camera={{ position: [0, 3.5, 6], fov: 50 }}
        dpr={[1, 1.5]}
        frameloop="always"
        style={{ width: '100%', height: '100%', background: 'transparent' }}
      >
        <fog attach="fog" args={['#08060a', 5, 11]} />
        <Suspense fallback={null}>
          <SceneContent />
        </Suspense>
      </Canvas>
    </div>
  );
}
