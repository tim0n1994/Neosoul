import { AccessToken, RoomServiceClient, EgressClient, RoomCompositeEgressRequest } from 'livekit-server-sdk';

const lkUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL ?? '';
// RoomServiceClient 需要 https host（PRD §5.2 踩坑预警）
const httpUrl = lkUrl.replace(/^wss:\/\//, 'https://').replace(/^ws:\/\//, 'http://');

export const roomService = new RoomServiceClient(
  httpUrl,
  process.env.LIVEKIT_API_KEY ?? '',
  process.env.LIVEKIT_API_SECRET ?? '',
);

// PRD §6.7 EgressClient——录制/回放。
export const egressClient = new EgressClient(
  httpUrl,
  process.env.LIVEKIT_API_KEY ?? '',
  process.env.LIVEKIT_API_SECRET ?? '',
);

// 便捷：构建 Room Composite Egress 请求（音频录制）
export { RoomCompositeEgressRequest };

export async function createToken(opts: {
  identity: string;
  name: string;
  room: string;
  canPublish: boolean;
  metadata: string;
}) {
  const at = new AccessToken(
    process.env.LIVEKIT_API_KEY!,
    process.env.LIVEKIT_API_SECRET!,
    {
      identity: opts.identity,
      name: opts.name,
      metadata: opts.metadata,
    },
  );
  at.addGrant({
    roomJoin: true,
    room: opts.room,
    canSubscribe: true,
    canPublish: opts.canPublish,
    canPublishData: true,
    canUpdateOwnMetadata: true,
  });
  // livekit-server-sdk v2：toJwt() 返回 Promise，必须 await（PRD §3.1）
  return await at.toJwt();
}
