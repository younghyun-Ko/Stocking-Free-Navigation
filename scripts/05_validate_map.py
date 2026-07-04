"""public/data/graph.json + cctv.geojson + lights.geojson 시각 검증용 folium 지도 생성"""
import json
from pathlib import Path

import folium

ROOT = Path(__file__).resolve().parent.parent
GRAPH_JSON = ROOT / "public" / "data" / "graph.json"
CCTV_GEOJSON = ROOT / "public" / "data" / "cctv.geojson"
LIGHTS_GEOJSON = ROOT / "public" / "data" / "lights.geojson"
OUT_HTML = ROOT / "scripts" / "validate_all.html"

HYEHWA_CENTER = (37.586, 127.001)


def safety_color(safety: float) -> str:
    if safety >= 0.6:
        return "#2ECC71"  # 초록
    if safety >= 0.3:
        return "#F39C12"  # 주황
    return "#E74C3C"  # 빨강


def add_graph_edges(m: folium.Map, graph: dict) -> int:
    edge_count = 0
    for edge in graph["edges"]:
        edge_count += 1
        locations = [(lat, lng) for lng, lat in edge["coords"]]

        popup_html = (
            f"length: {edge['length']}m<br>"
            f"safety: {edge['safety']}<br>"
            f"coverage: {edge['coverage']}<br>"
            f"light: {edge['light']}"
        )

        folium.PolyLine(
            locations=locations,
            color=safety_color(edge["safety"]),
            weight=3,
            opacity=0.8,
            popup=folium.Popup(popup_html, max_width=200),
        ).add_to(m)
    return edge_count


def add_cctv(m: folium.Map, geojson: dict) -> int:
    marker_count = 0
    for feature in geojson["features"]:
        marker_count += 1
        lng, lat = feature["geometry"]["coordinates"]
        props = feature["properties"]
        radius = props["coverageRadius"]

        popup_html = (
            f"<b>{props['purpose']}</b><br>"
            f"카메라 {props['cameraCount']}대 / {props['resolution']}만화소<br>"
            f"방면: {props['direction']}<br>"
            f"커버리지 반경: {radius}m<br>"
            f"{props['roadAddress']}"
        )

        folium.CircleMarker(
            location=(lat, lng),
            radius=5,
            color="#0083FF",
            fill=True,
            fill_color="#0083FF",
            fill_opacity=1.0,
            popup=folium.Popup(popup_html, max_width=250),
        ).add_to(m)

        folium.Circle(
            location=(lat, lng),
            radius=radius,
            color="#0083FF",
            weight=1,
            fill=True,
            fill_color="#0083FF",
            fill_opacity=0.12,
        ).add_to(m)
    return marker_count


def add_lights(m: folium.Map, geojson: dict) -> int:
    light_count = 0
    for feature in geojson["features"]:
        light_count += 1
        lng, lat = feature["geometry"]["coordinates"]

        folium.CircleMarker(
            location=(lat, lng),
            radius=2,
            color="#FFD400",
            weight=0,
            fill=True,
            fill_color="#FFD400",
            fill_opacity=0.9,
        ).add_to(m)
    return light_count


def main() -> None:
    with open(GRAPH_JSON, encoding="utf-8") as f:
        graph = json.load(f)
    with open(CCTV_GEOJSON, encoding="utf-8") as f:
        cctv_geojson = json.load(f)
    with open(LIGHTS_GEOJSON, encoding="utf-8") as f:
        lights_geojson = json.load(f)

    m = folium.Map(location=HYEHWA_CENTER, zoom_start=16, tiles="OpenStreetMap")

    edge_count = add_graph_edges(m, graph)
    light_count = add_lights(m, lights_geojson)
    marker_count = add_cctv(m, cctv_geojson)

    OUT_HTML.parent.mkdir(parents=True, exist_ok=True)
    m.save(str(OUT_HTML))
    print(
        f"저장 완료: {OUT_HTML} "
        f"(도로 {edge_count}개, 보안등/가로등 {light_count}개, CCTV {marker_count}개)"
    )


if __name__ == "__main__":
    main()
