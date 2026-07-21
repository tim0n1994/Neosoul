'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture, Html } from '@react-three/drei';
import * as THREE from 'three';
import type { Participant } from 'livekit-client';
import { avatarDataUri } from '@/lib/avatar';

interface Props {
  position: [number, number, number];
  participant: Participant;
  name: string;
  style: string;
  seed: string;
  isOnMic: boolean;
  themeColor: string;
}

// 单个球体：在 useFrame 内直接读 participant.audioLevel / isSpeaking，
// 保证逐帧拿到最新值（R3F 惯例：每帧变化的数据不进 React state）。PRD §11.3。
export function AvatarOrb({
  position,
  participant,
  name,
  style,
  seed,
  isOnMic,
  themeColor,
}: Props) {
  const meshRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const dataUri = useMemo(() => avatarDataUri(style, seed), [style, seed]);
  const texture = useTexture(dataUri);
  const emissive = useMemo(() => new THREE.Color(themeColor), [themeColor]);

  // 随机相位，错开浮动节奏
  const phase = useMemo(() => Math.random() * Math.PI * 2, []);

  useFrame((state) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const t = state.clock.elapsedTime;
    const level = participant.audioLevel ?? 0;
    const speaking = !!participant.isSpeaking;

    // 目标缩放：说话时随音量放大（K≈0.6），lerp 阻尼避免抖动
    const targetScale = 1 + (speaking ? Math.min(level * 0.6, 0.6) : 0);
    const next = THREE.MathUtils.lerp(mesh.scale.x, targetScale, 0.15);
    mesh.scale.setScalar(next);

    // emissive 随音量 0.1 → 1.2 插值
    const mat = mesh.material as THREE.MeshStandardMaterial;
    mat.emissiveIntensity = THREE.MathUtils.lerp(
      mat.emissiveIntensity,
      0.1 + Math.min(level * 1.1, 1.1),
      0.15,
    );

    // idle 浮动
    mesh.position.y = position[1] + Math.sin(t * 1.2 + phase) * 0.05;

    // 说话脉冲光环
    if (ringRef.current) {
      const ringMat = ringRef.current.material as THREE.MeshBasicMaterial;
      const visible = speaking && level > 0.05;
      ringMat.opacity = THREE.MathUtils.lerp(
        ringMat.opacity,
        visible ? 0.4 * Math.min(level * 2, 1) : 0,
        0.2,
      );
      ringRef.current.scale.setScalar(1 + Math.sin(t * 4) * 0.05);
    }
  });

  return (
    <group position={position}>
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.5, 32, 32]} />
        <meshStandardMaterial
          map={texture}
          emissive={emissive}
          emissiveIntensity={0.1}
          roughness={0.4}
        />
      </mesh>

      {/* 说话光环 */}
      <mesh ref={ringRef} position={[0, -0.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.7, 0.85, 32]} />
        <meshBasicMaterial color={themeColor} transparent opacity={0} side={THREE.DoubleSide} />
      </mesh>

      {/* 昵称（用 Html 避免 troika 字体 CDN 加载阻塞）*/}
      <Html
        position={[0, 0.85, 0]}
        center
        distanceFactor={6}
        style={{ pointerEvents: 'none', whiteSpace: 'nowrap' }}
      >
        <span
          style={{
            fontSize: '14px',
            fontWeight: 300,
            color: '#f5efe9',
            textShadow: '0 1px 4px rgba(0,0,0,0.8)',
          }}
        >
          {isOnMic ? `🎤 ${name}` : name}
        </span>
      </Html>
    </group>
  );
}
