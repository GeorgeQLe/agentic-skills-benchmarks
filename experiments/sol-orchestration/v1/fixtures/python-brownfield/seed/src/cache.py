import time


class TTLCache:
    def __init__(self, clock=time.monotonic):
        self._clock = clock
        self._values = {}

    def set(self, key, value, ttl):
        self._values[key] = (value, self._clock() + ttl)

    def get(self, key, default=None):
        entry = self._values.get(key)
        if entry is None:
            return default
        return entry[0]
