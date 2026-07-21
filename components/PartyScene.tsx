'use client';

import { Canvas } from '@react-three/fiber';
import { useParticipants } from '@livekit/components-react';
import { AvatarOrb } from '@/components/AvatarOrb';
import { useMemo } from 'react';

const THEME_COLOR = '#7c5cff';
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
      <ambientLight intensity={0.6} />
      <directionalLight position={[3, 5, 2]} intensity={0.8} />

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
    <Canvas
      camera={{ position: [0, 3.5, 6], fov: 50 }}
      dpr={[1, 1.5]}
      frameloop="always"
      style={{ background: 'radial-gradient(circle at 50% 40%, #14142a 0%, #0a0a12 70%)' }}
    >
      <fog attach="fog" args={['#0a0a12', 6, 12]} />
      <SceneContent />
    </Canvas>
  );
}
