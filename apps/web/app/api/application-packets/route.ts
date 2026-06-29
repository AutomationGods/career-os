import { createApplicationPacket, listApplicationPackets } from "./_handlers";

export async function GET(request: Request) {
  return listApplicationPackets(request);
}

export async function POST(request: Request) {
  return createApplicationPacket(request);
}
