def summarize(values):
    ordered = sorted(values)
    count = len(ordered)
    if count == 0:
        return {"count": 0, "minimum": None, "maximum": None, "median": None}
    middle = count // 2
    median = ordered[middle] if count % 2 else (ordered[middle - 1] + ordered[middle]) / 2
    return {
        "count": count,
        "minimum": ordered[0],
        "maximum": ordered[-1],
        "median": median,
    }
