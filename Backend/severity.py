"""Severity calculation.

Three inputs, each scored 1-3:
    flood_level      1 = ankle, 2 = knee, 3 = waist or higher
    water_movement   1 = still, 2 = flowing, 3 = fast / dangerous current
    road_condition   1 = passable, 2 = difficult, 3 = impassable

The three are averaged and rounded half-up to 1, 2 or 3, which maps to
low / mid / high.

Floor rule: flood_level 3 AND water_movement 3 is always "high", regardless
of the average. Deep + fast-moving water is the dangerous combination, and a
plain average would let a passable road (road_condition 1) drag it down to
"mid" (avg 2.33 -> 2).
"""

import math

LOW = "low"
MID = "mid"
HIGH = "high"

_BANDS = {1: LOW, 2: MID, 3: HIGH}


def compute_severity(flood_level: int, water_movement: int, road_condition: int) -> str:
    """Return "low", "mid" or "high" for three 1-3 scores."""
    # Floor rule: deep water with a fast current is always high.
    if flood_level == 3 and water_movement == 3:
        return HIGH

    average = (flood_level + water_movement + road_condition) / 3

    # NOTE: do not use the built-in round() here. Python uses banker's
    # rounding, so round(2.5) == 2, which is the opposite of the
    # "0.5 rounds up" rule. floor(x + 0.5) gives true half-up rounding.
    rounded = math.floor(average + 0.5)

    return _BANDS[rounded]