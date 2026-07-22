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

// 高级感 3D 头像气泡——多层结构：
// 1. 内核：头像纹理球（主视觉）
// 2. 玻璃外壳：半透明 MeshPhysicalMaterial（clearcoat + iridescence 虹彩）
// 3. 外发光环：说话时脉冲的 ring
// 4. 底座光晕：投影到地面的软光
export function AvatarOrb({
  position,
  participant,
  name,
  style,
  seed,
  isOnMic,
  themeColor,
}: Props) {
  const innerRef = useRef<THREE.Mesh>(null);
  const shellRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  const src = useMemo(() => {
    if (style === 'custom' && seed.startsWith('http')) return seed;
    return avatarDataUri(style, seed);
  }, [style, seed]);

  const texture = useTexture(src);

  const emissive = useMemo(() => new THREE.Color(themeColor), [themeColor]);
  const ringColor = useMemo(() => new THREE.Color(themeColor), [themeColor]);

  // 玻璃外壳材质——虹彩 + 透射 + clearcoat
  const shellMaterial = useMemo(() => {
    return new THREE.MeshPhysicalMaterial({
      transparent: true,
      opacity: 0.15,
      roughness: 0.0,
      metalness: 0.0,
      transmission: 0.9,
      thickness: 0.5,
      clearcoat: 1.0,
      clearcoatRoughness: 0.0,
      ior: 1.3,
      iridescence: 1.0,
      iridescenceIOR: 1.5,
      iridescenceThicknessRange: [100, 400],
      envMapIntensity: 1.0,
    });
  }, []);

  const phase = useMemo(() => Math.random() * Math.PI * 2, []);
  const rotSpeed = useMemo(() => 0.0015 + Math.random() * 0.001, []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const level = participant.audioLevel ?? 0;
    const speaking = !!participant.isSpeaking;

    // 内核：说话放大 + emissive 脉冲 + 浮动 + 自转
    if (innerRef.current) {
      const targetScale = 1 + (speaking ? Math.min(level * 0.4, 0.4) : 0);
      const next = THREE.MathUtils.lerp(innerRef.current.scale.x, targetScale, 0.12);
      innerRef.current.scale.setScalar(next);
      innerRef.current.position.y = Math.sin(t * 1.2 + phase) * 0.06;
      innerRef.current.rotation.y += rotSpeed;

      const mat = innerRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = THREE.MathUtils.lerp(
        mat.emissiveIntensity,
        0.15 + Math.min(level * 0.8, 0.8),
        0.12,
      );
    }

    // 玻璃外壳：说话时 opacity 微增 + scale 跟随
    if (shellRef.current) {
      const shellScale = 1 + (speaking ? Math.min(level * 0.3, 0.25) : 0);
      const next = THREE.MathUtils.lerp(shellRef.current.scale.x, shellScale, 0.08);
      shellRef.current.scale.setScalar(next);
      shellMaterial.opacity = THREE.MathUtils.lerp(
        shellMaterial.opacity,
        speaking ? 0.25 : 0.12,
        0.08,
      );
    }

    // 发光环：说话时脉冲
    if (ringRef.current) {
      const visible = speaking && level > 0.03;
      const ringMat = ringRef.current.material as THREE.MeshBasicMaterial;
      ringMat.opacity = THREE.MathUtils.lerp(
        ringMat.opacity,
        visible ? 0.35 + Math.min(level * 0.4, 0.4) : 0,
        0.15,
      );
      ringRef.current.scale.setScalar(1 + Math.sin(t * 5) * 0.08);
    }

    // 底座光晕
    if (glowRef.current) {
      const glowMat = glowRef.current.material as THREE.MeshBasicMaterial;
      glowMat.opacity = THREE.MathUtils.lerp(
        glowMat.opacity,
        speaking ? 0.15 + Math.min(level * 0.2, 0.2) : 0.05,
        0.1,
      );
    }
  });

  return (
    <group position={position}>
      {/* 底座光晕 */}
      <mesh ref={glowRef} position={[0, -0.48, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.6, 32]} />
        <meshBasicMaterial color={ringColor} transparent opacity={0.05} side={THREE.DoubleSide} />
      </mesh>

      {/* 内核——头像纹理球 */}
      <mesh ref={innerRef}>
        <sphereGeometry args={[0.42, 48, 48]} />
        <meshStandardMaterial
          map={texture}
          emissive={emissive}
          emissiveIntensity={0.15}
          roughness={0.35}
          metalness={0.1}
        />
      </mesh>

      {/* 玻璃外壳——虹彩折射 */}
      <mesh ref={shellRef} material={shellMaterial}>
        <sphereGeometry args={[0.52, 48, 48]} />
      </mesh>

      {/* 说话脉冲环 */}
      <mesh ref={ringRef} position={[0, -0.45, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.65, 0.78, 48]} />
        <meshBasicMaterial color={ringColor} transparent opacity={0} side={THREE.DoubleSide} />
      </mesh>

      {/* 昵称 */}
      <Html position={[0, 0.85, 0]} center distanceFactor={6}
        style={{ pointerEvents: 'none', whiteSpace: 'nowrap' }}>
        <span style={{
          fontSize: '13px',
          fontWeight: 300,
          color: '#f5efe9',
          textShadow: '0 1px 6px rgba(0,0,0,0.9)',
        }}>
          {isOnMic ? `🎤 ${name}` : name}
        </span>
      </Html>
    </group>
  );
}
