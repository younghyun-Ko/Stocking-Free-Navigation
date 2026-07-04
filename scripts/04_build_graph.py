"""roads.geojson + cctv.geojson + lights.geojson -> 안전점수가 계산된 public/data/graph.json 생성"""
import json
from pathlib import Path

import numpy as np
from pyproj import Transformer
from shapely.geometry import LineString, Point
from shapely.strtree import STRtree

ROOT = Path(__file__).resolve().parent.parent
ROADS_GEOJSON = ROOT / "public" / "data" / "roads.geojson"
CCTV_GEOJSON = ROOT / "public" / "data" / "cctv.geojson"
LIGHTS_GEOJSON = ROOT / "public" / "data" / "lights.geojson"
OUT_PATH = ROOT / "public" / "data" / "graph.json"

SAMPLE_INTERVAL = 10  # m
LIGHT_BUFFER = 25  # m
LIGHT_DIVISOR = 3
COVERAGE_WEIGHT = 0.7
LIGHT_WEIGHT = 0.3
MAX_SIZE_BYTES = 5 * 1024 * 1024
MIN_MEAN_LIGHT_SCORE = 0.05

transformer = Transformer.from_crs("EPSG:4326", "EPSG:5186", always_xy=True)


def project(lng: float, lat: float) -> tuple[float, float]:
    return transformer.transform(lng, lat)


def load_geojson(path: Path) -> dict:
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def load_roads(path: Path):
    geojson = load_geojson(path)
    nodes = {}
    edges = []
    for feature in geojson["features"]:
        geom = feature["geometry"]
        props = feature["properties"]
        if geom["type"] == "Point":
            nodes[props["id"]] = geom["coordinates"]
        elif geom["type"] == "LineString":
            edges.append(
                {
                    "u": props["u"],
                    "v": props["v"],
                    "length": props["length"],
                    "coords": geom["coordinates"],
                }
            )
    return nodes, edges


def load_point_tree(path: Path, type_filter: str | None = None):
    """포인트 geojson을 읽어 (STRtree, 부가정보 배열)을 만든다. 파일이 없거나 비면 (None, [])."""
    if not path.exists():
        return None, []

    geojson = load_geojson(path)
    projected_points = []
    extras = []
    for feature in geojson["features"]:
        props = feature["properties"]
        if type_filter is not None and props.get("type") != type_filter:
            continue
        lng, lat = feature["geometry"]["coordinates"]
        x, y = project(lng, lat)
        projected_points.append(Point(x, y))
        extras.append(props)

    if not projected_points:
        return None, []

    return STRtree(projected_points), extras


def sample_points_along(line: LineString, interval: float) -> list[Point]:
    length = line.length
    if length < interval:
        return [line.interpolate(0.5, normalized=True)]
    distances = np.arange(0, length, interval)
    return [line.interpolate(d) for d in distances]


def compute_coverage_ratio(samples, cctv_tree, cctv_radii, max_radius) -> float:
    if cctv_tree is None or not samples:
        return 0.0

    covered = np.zeros(len(samples), dtype=bool)
    sample_arr = np.array(samples, dtype=object)
    pairs = cctv_tree.query(sample_arr, predicate="dwithin", distance=max_radius)
    for sample_idx, tree_idx in zip(pairs[0], pairs[1]):
        if covered[sample_idx]:
            continue
        dist = samples[sample_idx].distance(cctv_tree.geometries[tree_idx])
        if dist <= cctv_radii[tree_idx]:
            covered[sample_idx] = True

    return float(covered.sum()) / len(samples)


def compute_light_score(line: LineString, light_tree) -> float:
    if light_tree is None:
        return 0.0
    matches = light_tree.query(line, predicate="dwithin", distance=LIGHT_BUFFER)
    count = len(matches)
    return min(count / LIGHT_DIVISOR, 1.0)


def print_histogram(safety_values: list[float]) -> None:
    bins = [0.0] * 10
    for s in safety_values:
        idx = min(int(s * 10), 9)
        bins[idx] += 1
    max_count = max(bins) if bins else 1
    print("safety 분포 히스토그램:")
    for i, count in enumerate(bins):
        lo, hi = i / 10, (i + 1) / 10
        bar_len = int((count / max_count) * 40) if max_count else 0
        print(f"  {lo:.1f}-{hi:.1f}: {'#' * bar_len} ({int(count)})")


def dump_graph(nodes: dict, edges: list[dict]) -> bytes:
    graph = {"nodes": nodes, "edges": edges}
    return json.dumps(graph, ensure_ascii=False, indent=2).encode("utf-8")


def main() -> None:
    nodes, raw_edges = load_roads(ROADS_GEOJSON)
    print(f"도로망 로드: 노드 {len(nodes)}, 엣지 {len(raw_edges)}")

    cctv_tree, cctv_props = load_point_tree(CCTV_GEOJSON)
    cctv_radii = [p["coverageRadius"] for p in cctv_props]
    max_cctv_radius = max(cctv_radii) if cctv_radii else 60
    print(f"CCTV 로드: {len(cctv_props)}개 (최대 커버리지 반경 {max_cctv_radius}m)")

    light_tree, light_props = load_point_tree(LIGHTS_GEOJSON, type_filter="security")
    print(f"보안등 로드: {len(light_props)}개")

    edges = []
    safety_values = []
    coverage_values = []
    light_values = []

    for raw_edge in raw_edges:
        wgs84_coords = raw_edge["coords"]
        projected_coords = [project(lng, lat) for lng, lat in wgs84_coords]
        line = LineString(projected_coords)

        samples = sample_points_along(line, SAMPLE_INTERVAL)
        coverage = compute_coverage_ratio(samples, cctv_tree, cctv_radii, max_cctv_radius)
        light = compute_light_score(line, light_tree)
        safety = COVERAGE_WEIGHT * coverage + LIGHT_WEIGHT * light

        edges.append(
            {
                "u": raw_edge["u"],
                "v": raw_edge["v"],
                "length": round(raw_edge["length"], 2),
                "safety": round(safety, 4),
                "coverage": round(coverage, 4),
                "light": round(light, 4),
                "coords": wgs84_coords,
            }
        )
        safety_values.append(safety)
        coverage_values.append(coverage)
        light_values.append(light)

    mean_safety = sum(safety_values) / len(safety_values)
    mean_light = sum(light_values) / len(light_values)
    zero_coverage_ratio = sum(1 for c in coverage_values if c == 0.0) / len(coverage_values)

    print_histogram(safety_values)
    print(f"coverage=0인 엣지 비율: {zero_coverage_ratio:.1%}")
    print(f"평균 safety: {mean_safety:.4f}")
    print(f"평균 light_score: {mean_light:.4f}")

    if mean_light < MIN_MEAN_LIGHT_SCORE:
        raise SystemExit(
            f"[검증 실패] 평균 light_score {mean_light:.4f}가 {MIN_MEAN_LIGHT_SCORE} 미만입니다. "
            "버퍼 거리 계산(투영/STRtree) 로직을 점검하세요."
        )

    payload = dump_graph(nodes, edges)
    if len(payload) > MAX_SIZE_BYTES:
        print(
            f"[정보] graph.json이 {len(payload) / 1024 / 1024:.2f}MB로 5MB를 초과해 "
            "coords 좌표를 소수점 6자리로 반올림합니다."
        )
        for edge in edges:
            edge["coords"] = [[round(lng, 6), round(lat, 6)] for lng, lat in edge["coords"]]
        payload = dump_graph(nodes, edges)

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUT_PATH, "wb") as f:
        f.write(payload)

    print(f"저장 완료: {OUT_PATH} ({len(payload) / 1024 / 1024:.2f}MB)")


if __name__ == "__main__":
    main()
