import { getIO, userRoom } from './socket.js';

export function publishToUser(userId: string, type: string, data: unknown): void {
  getIO()?.to(userRoom(userId)).emit(type, data);
}
