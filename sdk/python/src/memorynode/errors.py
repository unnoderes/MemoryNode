from __future__ import annotations

class MemoryNodeError(Exception):
    """Base error for MemoryNode client operations."""

    def __init__(self, message: str, *, request_id: str | None = None, status_code: int | None = None, detail: str | None = None):
        self.request_id = request_id
        self.status_code = status_code
        self.detail = detail
        super().__init__(message)


class MemoryNodeConnectionError(MemoryNodeError):
    """The local MemoryNode API could not be reached."""


class MemoryNodeTimeoutError(MemoryNodeError):
    """The MemoryNode API request timed out."""


class MemoryNodeHTTPError(MemoryNodeError):
    """A non-success HTTP response not covered by a more specific error."""


class MemoryNodeValidationError(MemoryNodeHTTPError):
    """The API rejected the request with HTTP 400 or 422."""


class MemoryNodeNotFoundError(MemoryNodeHTTPError):
    """The requested object does not exist."""


class MemoryNodeConflictError(MemoryNodeHTTPError):
    """The requested lifecycle transition conflicts with current state."""


class MemoryNodeResponseError(MemoryNodeError):
    """A successful API response did not match the public contract."""


class MemoryNodeServerError(MemoryNodeHTTPError):
    """The API or model service failed."""
