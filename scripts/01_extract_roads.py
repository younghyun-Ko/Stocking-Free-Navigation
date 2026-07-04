"""OSM 보행 네트워크 다운로드 -> public/data/roads.geojson 변환"""
import json
from pathlib import Path

import networkx as nx
import osmnx as ox

ROOT = Path(__file__).resolve().parent.parent
OUT_PATH = ROOT / "public" / "data" / "roads.geojson"

# CLAUDE.md 대상 지역 bbox
LAT_MIN, LAT_MAX = 37.575, 37.596
LNG_MIN, LNG_MAX = 126.993, 127.010

OSMNX_MAJOR_VERSION = int(ox.__version__.split(".")[0])


def download_graph() -> nx.MultiDiGraph:
    """osmnx 메이저 버전에 따라 graph_from_bbox 시그니처가 다르므로 분기 처리."""
    if OSMNX_MAJOR_VERSION >= 2:
        # v2: bbox=(left, bottom, right, top) = (west, south, east, north)
        bbox = (LNG_MIN, LAT_MIN, LNG_MAX, LAT_MAX)
        return ox.graph_from_bbox(bbox, network_type="walk")
    # v1: north, south, east, west 개별 인자
    return ox.graph_from_bbox(
        north=LAT_MAX, south=LAT_MIN, east=LNG_MAX, west=LNG_MIN, network_type="walk"
    )


def clean_value(value):
    """osmnx 태그값(list/NaN/numpy 스칼라)을 JSON 직렬화 가능한 값으로 정리."""
    if isinstance(value, list):
        return ", ".join(str(v) for v in value)
    if isinstance(value, float) and value != value:  # NaN
        return None
    if value is None:
        return None
    if hasattr(value, "item"):
        return value.item()
    return value


def main() -> None:
    print(f"osmnx {ox.__version__} 감지 (major={OSMNX_MAJOR_VERSION})")

    G = download_graph()
    print(f"다운로드 원본 그래프: 노드 {G.number_of_nodes()}, 엣지 {G.number_of_edges()}")

    # 무방향 변환
    G_undirected = ox.convert.to_undirected(G)

    # 가장 큰 연결 컴포넌트만 유지 (고립된 컴포넌트 제거)
    largest_cc = max(nx.connected_components(G_undirected), key=len)
    G_undirected = G_undirected.subgraph(largest_cc).copy()

    nodes, edges = ox.graph_to_gdfs(G_undirected)

    node_count = len(nodes)
    edge_count = len(edges)
    print(f"최종 그래프 (최대 연결 컴포넌트, 무방향): 노드 {node_count}, 엣지 {edge_count}")

    features = []

    for osmid, row in nodes.iterrows():
        features.append(
            {
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [row.geometry.x, row.geometry.y],
                },
                "properties": {"id": clean_value(osmid)},
            }
        )

    for (u, v, _key), row in edges.iterrows():
        coords = [[x, y] for x, y in row.geometry.coords]
        features.append(
            {
                "type": "Feature",
                "geometry": {"type": "LineString", "coordinates": coords},
                "properties": {
                    "u": clean_value(u),
                    "v": clean_value(v),
                    "length": round(clean_value(row.get("length")), 2)
                    if row.get("length") is not None
                    else None,
                    "name": clean_value(row.get("name")),
                    "highway": clean_value(row.get("highway")),
                },
            }
        )

    geojson = {"type": "FeatureCollection", "features": features}

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUT_PATH, "w", encoding="utf-8") as f:
        json.dump(geojson, f, ensure_ascii=False, indent=2)

    print(f"저장 완료: {OUT_PATH} (노드 {node_count} + 엣지 {edge_count} = {len(features)}개 피처)")


if __name__ == "__main__":
    main()
