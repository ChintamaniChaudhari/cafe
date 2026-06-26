"""
CafeOS in-process async event bus.

Enables decoupled communication between domain engines.
Kitchen WebSocket manager subscribes to order events and broadcasts
to connected KDS clients.

Event types:
  - ORDER_CREATED
  - ORDER_STATUS_CHANGED
  - MENU_UPDATED
  - ITEM_DISABLED
"""

import asyncio
import logging
from collections import defaultdict
from enum import Enum
from typing import Any, Callable, Coroutine

logger = logging.getLogger(__name__)


class EventType(str, Enum):
    """Domain events used across CafeOS engines."""

    ORDER_CREATED = "ORDER_CREATED"
    ORDER_STATUS_CHANGED = "ORDER_STATUS_CHANGED"
    MENU_UPDATED = "MENU_UPDATED"
    ITEM_DISABLED = "ITEM_DISABLED"


# Type alias for event handler coroutines
EventHandler = Callable[[dict[str, Any]], Coroutine[Any, Any, None]]


class EventBus:
    """Simple in-process pub/sub event bus using asyncio."""

    def __init__(self) -> None:
        self._subscribers: dict[EventType, list[EventHandler]] = defaultdict(list)

    def subscribe(self, event_type: EventType, handler: EventHandler) -> None:
        """Register a handler for a specific event type."""
        self._subscribers[event_type].append(handler)
        logger.info("Subscribed handler %s to %s", handler.__name__, event_type.value)

    async def publish(self, event_type: EventType, data: dict[str, Any]) -> None:
        """
        Publish an event to all subscribers.

        Handlers run concurrently via asyncio.gather.
        A failing handler does not prevent other handlers from executing.
        """
        handlers = self._subscribers.get(event_type, [])
        if not handlers:
            logger.debug("No subscribers for event %s", event_type.value)
            return

        logger.info(
            "Publishing %s to %d handler(s)",
            event_type.value,
            len(handlers),
        )

        results = await asyncio.gather(
            *(handler(data) for handler in handlers),
            return_exceptions=True,
        )

        for i, result in enumerate(results):
            if isinstance(result, Exception):
                logger.error(
                    "Handler %s failed for event %s: %s",
                    handlers[i].__name__,
                    event_type.value,
                    result,
                )


# Singleton event bus instance
event_bus = EventBus()
