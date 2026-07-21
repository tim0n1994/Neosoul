import { AccessToken, RoomServiceClient } from 'livekit-server-sdk';

// RoomServiceClient 需要 https host（PRD §5.2 踩坑预警）
const httpUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL!.replace('wss://', 'https://');

export const roomService = new RoomServiceClient(
  httpUrl,
  process.env.LIVEKIT_API_KEY!,
  process.env.LIVEKIT_API_SECRET!,
);

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
