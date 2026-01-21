# =========================================================
# 🎬 WatchTogether Server (FIXED)
# =========================================================

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from uuid import uuid4
from typing import Dict, Set
import os
import asyncio


# =========================================================
# 🚀 App Initialization
# =========================================================

app = FastAPI(title="WatchTogether Server")


# =========================================================
# 📂 Path Configuration
# =========================================================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PUBLIC_DIR = os.path.abspath(os.path.join(BASE_DIR, "..", "public"))
STATIC_DIR = os.path.join(PUBLIC_DIR, "static")

print("✅ PUBLIC_DIR:", PUBLIC_DIR)
print("✅ STATIC_DIR:", STATIC_DIR)


# =========================================================
# 🌐 Static File Serving
# =========================================================

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


@app.get("/")
async def serve_index():
    return FileResponse(os.path.join(PUBLIC_DIR, "index.html"))


# =========================================================
# 🧠 In-Memory State
# =========================================================

# room_name -> set(client_ids)
rooms: Dict[str, Set[str]] = {}
# room_name -> playback state
room_state: Dict[str, dict] = {}

# client_id -> websocket
clients: Dict[str, WebSocket] = {}

# reverse lookup: websocket -> client_id
socket_to_client: Dict[WebSocket, str] = {}


# =========================================================
# 🔌 WebSocket Endpoint
# =========================================================

@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await ws.accept()

    client_id = str(uuid4())
    clients[client_id] = ws
    socket_to_client[ws] = client_id

    print(f"👤 Client connected: {client_id}")

    # Notify client of its ID
    await ws.send_json({
        "type": "connected",
        "clientId": client_id
    })

    current_room: str | None = None

    try:
        while True:
            msg = await ws.receive_json()
            if not isinstance(msg, dict):
                continue

            msg_type = msg.get("type")
            room = msg.get("room")

            print("📩 Message:", msg)

            # ---------------- Create Room ----------------
            if msg_type == "createRoom":
                if not room:
                    continue

                rooms.setdefault(room, set())
                await ws.send_json({
                    "type": "roomCreated",
                    "room": room
                })

            # ---------------- Join Room ----------------
            elif msg_type == "join":
                if not room:
                    continue
                
                rooms.setdefault(room, set())
                cleanup_dead_clients(room)

                rooms[room].add(client_id)
                current_room = room

                print(f"👥 {client_id} joined room {room}")
                await broadcast_participants(room)

                # ✅ Send current room state to newly joined client
                state = room_state.get(room)
                if state:
                    try:
                        await ws.send_json({
                            "type": "roomState",
                            "state": state
                        })
                    except:
                        pass
                    
                    
            # ---------------- Ready State ----------------
            elif msg_type == "ready":
                await broadcast(room, {
                    "type": "ready",
                    "from": client_id,
                    "ready": msg.get("ready", False)
                })

            # ---------------- Video Load ----------------
            elif msg_type == "video":
                # Save room video state
                room_state[room] = {
                    "video": {
                        "mode": msg.get("mode"),
                        "videoId": msg.get("videoId")
                    },
                    "playing": False,
                    "position": 0
                }
                await broadcast(room, msg)


            # ---------------- Playback Commands ----------------
            elif msg_type == "command":
                # Update play/pause state
                if room in room_state:
                    room_state[room]["playing"] = msg.get("action") == "play"
                await broadcast(room, msg)  

            # ---------------- Seek Sync ----------------
            elif msg_type == "seek":
                await broadcast(room, {
                    "type": "seek",
                    "position": msg.get("position")
                })

            # ---------------- Heartbeat Sync ----------------
            elif msg_type == "heartbeat":
                # Persist latest position
                if room in room_state:
                    room_state[room]["position"] = msg.get("position", 0)
                await broadcast(room, msg)
            

            # ---------------- Local Video Metadata ----------------
            elif msg_type == "localMeta":
                await broadcast(room, {
                    "type": "localMeta",
                    "from": client_id,
                    "duration": msg.get("duration"),
                    "size": msg.get("size")
                })

            # ---------------- Clear Video ----------------
            elif msg_type == "clearVideo":
                await broadcast(room, {
                    "type": "clearVideo"
                })

            # ---------------- Chat ----------------
            elif msg_type == "chat":
                await broadcast(room, {
                    "type": "chat",
                    "from": client_id,
                    "fromName": msg.get("fromName"),
                    "text": msg.get("text")
                })

    except WebSocketDisconnect:
        print(f"❌ Client disconnected: {client_id}")

    finally:
        cleanup_client(client_id, current_room)


# =========================================================
# 🧹 Cleanup Helpers
# =========================================================

def cleanup_client(client_id: str, room: str | None):
    """Remove client from all registries safely."""
    ws = clients.pop(client_id, None)

    if ws:
        socket_to_client.pop(ws, None)

    if room and room in rooms:
        rooms[room].discard(client_id)

        if len(rooms[room]) == 0:
            del rooms[room]
        else:
            asyncio.create_task(broadcast_participants(room))


def cleanup_dead_clients(room: str):
    """Remove dead sockets from a room."""
    if room not in rooms:
        return

    dead = set()

    for cid in rooms[room]:
        ws = clients.get(cid)
        if not ws or ws.client_state.name != "CONNECTED":
            dead.add(cid)

    for cid in dead:
        print(f"🧹 Removing stale client {cid}")
        rooms[room].discard(cid)
        clients.pop(cid, None)


# =========================================================
# 🔁 Broadcast Helpers (SAFE)
# =========================================================

async def broadcast(room: str, data: dict):
    if room not in rooms:
        return

    dead = []

    for cid in list(rooms[room]):
        ws = clients.get(cid)
        if not ws:
            dead.append(cid)
            continue

        try:
            await ws.send_json(data)
        except Exception as e:
            print(f"⚠️ Send failed to {cid}: {e}")
            dead.append(cid)

    # Cleanup broken sockets
    for cid in dead:
        rooms[room].discard(cid)
        clients.pop(cid, None)


async def broadcast_participants(room: str):
    if room not in rooms:
        return

    await broadcast(room, {
        "type": "participants",
        "list": list(rooms[room])
    })
