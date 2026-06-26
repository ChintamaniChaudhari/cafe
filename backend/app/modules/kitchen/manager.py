"""
Kitchen WebSocket connection manager.

Manages active KDS WebSocket connections and broadcasts order events.
Subscribes to ORDER_CREATED and ORDER_STATUS_CHANGED events from the event bus.

The 500ms Rule: broadcasts must render on client in <500ms.
"""

import json
import logging
from typing import Any

from fastapi import WebSocket

from app.core.events import EventType, event_bus

logger = logging.getLogger(__name__)


class KitchenConnectionManager:
    """Manages WebSocket connections for Kitchen Display System (KDS) clients."""

    def __init__(self) -> None:
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket) -> None:
        """Accept a new KDS WebSocket connection."""
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(
            "Kitchen WS client connected. Total: %d",
            len(self.active_connections),
        )

    def disconnect(self, websocket: WebSocket) -> None:
        """Remove a disconnected KDS client."""
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        logger.info(
            "Kitchen WS client disconnected. Total: %d",
            len(self.active_connections),
        )

    async def broadcast(self, data: dict[str, Any]) -> None:
        """
        Broadcast an event to all connected KDS clients.

        Failed sends are caught per-client so one broken connection
        doesn't block others.
        """
        if not self.active_connections:
            return

        message = json.dumps(data)
        disconnected = []

        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception:
                logger.warning("Failed to send to a KDS client, marking for removal.")
                disconnected.append(connection)

        # Clean up dead connections
        for conn in disconnected:
            self.disconnect(conn)

    async def _handle_order_event(self, data: dict[str, Any]) -> None:
        """Event bus handler: broadcast order events to KDS clients."""
        await self.broadcast(data)

    def register_event_handlers(self) -> None:
        """Subscribe to order events on the event bus."""
        event_bus.subscribe(EventType.ORDER_CREATED, self._handle_order_event)
        event_bus.subscribe(EventType.ORDER_STATUS_CHANGED, self._handle_order_event)
        logger.info("Kitchen WS manager subscribed to order events.")


# Singleton manager instance
kitchen_manager = KitchenConnectionManager()
