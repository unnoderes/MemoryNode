class MemoryNodeError(Exception):
    """Base error for MemoryNode client operations."""


class MemoryNodeConnectionError(MemoryNodeError):
    """The local MemoryNode API could not be reached."""


class MemoryNodeTimeoutError(MemoryNodeError):
    """The MemoryNode API request timed out and may be retried."""


class MemoryNodeHTTPError(MemoryNodeError):
    def __init__(self, status_code: int, message: str):
        self.status_code = status_code
        super().__init__(message)
