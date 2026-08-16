"""
mcp.py — Minimum Convex Polygon (MCP) & Home Range Occupancy Engine
Pench Tiger Reserve Camera Trap Intelligence System

Calculates:
  - 100% Minimum Convex Polygon (MCP) boundary
  - Territory surface area in km² (geodesic coordinate projection)
  - Territory centroid coordinates (lat, lon)
  - Shift in centroid between survey cycles
"""

import math
from typing import Dict, List, Optional, Tuple

import numpy as np


def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate Great Circle distance in km between two GPS points."""
    R = 6371.0  # Earth radius in kilometers
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2.0) ** 2
        + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2.0) ** 2
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c


def polygon_area_km2(coords: List[Tuple[float, float]]) -> float:
    """
    Calculate area in km² of a polygon specified by GPS (lat, lon) coordinates
    using equirectangular projection centered at polygon mean.
    """
    if len(coords) < 3:
        return 0.0

    mean_lat = sum(c[0] for c in coords) / len(coords)
    mean_lon = sum(c[1] for c in coords) / len(coords)

    # Convert lat/lon to local x/y in kilometers
    # 1 deg lat ≈ 111.139 km
    # 1 deg lon ≈ 111.139 * cos(mean_lat) km
    lat_to_km = 111.139
    lon_to_km = 111.139 * math.cos(math.radians(mean_lat))

    xy = [( (c[1] - mean_lon) * lon_to_km, (c[0] - mean_lat) * lat_to_km ) for c in coords]

    # Shoelace formula
    n = len(xy)
    area = 0.0
    for i in range(n):
        j = (i + 1) % n
        area += xy[i][0] * xy[j][1]
        area -= xy[j][0] * xy[i][1]

    return abs(area) / 2.0


def calculate_convex_hull(points: List[Tuple[float, float]]) -> List[Tuple[float, float]]:
    """
    Compute 2D Convex Hull using Graham Scan algorithm.
    Input: list of (lat, lon) tuples.
    Output: vertices of the convex hull in counter-clockwise order.
    """
    pts = sorted(list(set(points)))
    if len(pts) <= 2:
        return pts

    def cross(o, a, b):
        return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])

    # Lower hull
    lower = []
    for p in pts:
        while len(lower) >= 2 and cross(lower[-2], lower[-1], p) <= 0:
            lower.pop()
        lower.append(p)

    # Upper hull
    upper = []
    for p in reversed(pts):
        while len(upper) >= 2 and cross(upper[-2], upper[-1], p) <= 0:
            upper.pop()
        upper.append(p)

    # Concatenate lower and upper (remove duplicate endpoints)
    return lower[:-1] + upper[:-1]


def calculate_tiger_home_range(sightings: List[Dict]) -> Dict:
    """
    Calculate territory statistics from a list of sightings records:
    [{'latitude': 21.72, 'longitude': 79.31, 'timestamp': '...', 'station_id': 'C01'}, ...]

    Returns:
    {
        "total_sightings": 14,
        "unique_stations": ["C01", "C03", "C07"],
        "centroid_lat": 21.7312,
        "centroid_lon": 79.3341,
        "home_range_km2": 18.42,
        "mcp_polygon": [(lat1, lon1), (lat2, lon2), ...]
    }
    """
    if not sightings:
        return {
            "total_sightings": 0,
            "unique_stations": [],
            "centroid_lat": None,
            "centroid_lon": None,
            "home_range_km2": 0.0,
            "mcp_polygon": [],
        }

    points = [(float(s["latitude"]), float(s["longitude"])) for s in sightings if s.get("latitude") and s.get("longitude")]
    unique_stations = sorted(list(set(s["station_id"] for s in sightings if s.get("station_id"))))

    if not points:
        return {
            "total_sightings": len(sightings),
            "unique_stations": unique_stations,
            "centroid_lat": None,
            "centroid_lon": None,
            "home_range_km2": 0.0,
            "mcp_polygon": [],
        }

    centroid_lat = sum(p[0] for p in points) / len(points)
    centroid_lon = sum(p[1] for p in points) / len(points)

    hull = calculate_convex_hull(points)
    area = polygon_area_km2(hull) if len(hull) >= 3 else 0.0

    return {
        "total_sightings": len(sightings),
        "unique_stations": unique_stations,
        "centroid_lat": round(centroid_lat, 6),
        "centroid_lon": round(centroid_lon, 6),
        "home_range_km2": round(area, 2),
        "mcp_polygon": hull,
    }
