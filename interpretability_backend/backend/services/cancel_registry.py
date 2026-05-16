"""Cancel event registry for embedding jobs.

Provides a global, thread-safe registry of threading.Event objects
keyed by collection_name. The embedding mutations register an event
before starting a pipeline, the cancel mutation looks it up and sets it,
and the batch loops check it between batches for cooperative cancellation.
"""

import threading

_active_cancel_events: dict[str, threading.Event] = {}
_lock = threading.Lock()


def register_cancel_event(collection_name: str) -> threading.Event:
    """Create and store a cancel event for a job. Returns the event."""
    event = threading.Event()
    with _lock:
        _active_cancel_events[collection_name] = event
    return event


def request_cancel(collection_name: str) -> bool:
    """Signal cancellation for a running job. Returns True if a job was found."""
    with _lock:
        event = _active_cancel_events.get(collection_name)
    if event is not None:
        event.set()
        return True
    return False


def unregister_cancel_event(collection_name: str) -> None:
    """Remove the cancel event after a job finishes."""
    with _lock:
        _active_cancel_events.pop(collection_name, None)
