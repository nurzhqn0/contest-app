from collections import defaultdict

from fastapi import WebSocket


class RoomSocketManager:
    def __init__(self) -> None:
        self.connections: dict[int, list[WebSocket]] = defaultdict(list)

    async def connect(self, room_id: int, websocket: WebSocket) -> None:
        await websocket.accept()
        self.connections[room_id].append(websocket)

    def disconnect(self, room_id: int, websocket: WebSocket) -> None:
        if websocket in self.connections[room_id]:
            self.connections[room_id].remove(websocket)

    async def broadcast(self, room_id: int, payload: dict) -> None:
        stale: list[WebSocket] = []
        for websocket in self.connections[room_id]:
            try:
                await websocket.send_json(payload)
            except Exception:
                stale.append(websocket)
        for websocket in stale:
            self.disconnect(room_id, websocket)


room_socket_manager = RoomSocketManager()
