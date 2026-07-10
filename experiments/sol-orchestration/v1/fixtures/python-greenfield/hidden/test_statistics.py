import unittest

from src.statistics import summarize


class SummarizeTest(unittest.TestCase):
    def test_summary_and_non_mutation(self):
        values = [9, 1, 4, 2]
        self.assertEqual(
            summarize(values),
            {"count": 4, "minimum": 1, "maximum": 9, "median": 3.0},
        )
        self.assertEqual(values, [9, 1, 4, 2])

    def test_empty_and_odd(self):
        self.assertEqual(
            summarize([]),
            {"count": 0, "minimum": None, "maximum": None, "median": None},
        )
        self.assertEqual(summarize([7, 2, 3])["median"], 3)


if __name__ == "__main__":
    unittest.main()
