import unittest

from src.cache import TTLCache


class TTLCacheTest(unittest.TestCase):
    def test_expiration_and_injected_clock(self):
        now = [10.0]
        cache = TTLCache(lambda: now[0])
        cache.set("token", "secret", 5)
        self.assertEqual(cache.get("token"), "secret")
        now[0] = 15.0
        self.assertEqual(cache.get("token", "missing"), "missing")

    def test_zero_ttl_expires_immediately(self):
        cache = TTLCache(lambda: 2.0)
        cache.set("zero", None, 0)
        self.assertEqual(cache.get("zero", "missing"), "missing")


if __name__ == "__main__":
    unittest.main()
