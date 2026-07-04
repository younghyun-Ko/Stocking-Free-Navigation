"""public/data/roads.geojson + cctv.geojson 시각 검증용 folium 지도 생성"""
import json
from pathlib import Path

import folium

ROOT = Path(__file__).resolve().parent.parent
ROADS_GEOJSON = ROOT / "public" / "data" / "roads.geojson"
CCTV_GEOJSON = ROOT / "public" / "data" / "cctv.geojson"
OUT_HTML = ROOT / "scripts" / "validate_all.html"

HYEHWA_CENTER = (37.586, 127.001)


def add_roads(m: folium.Map, geojson: dict) -> int:
    edge_count = 0
    for feature in geojson["features"]:
        if feature["geometry"]["type"] != "LineString":
            continue
        edge_count += 1
        coords = feature["geometry"]["coordinates"]
        locations = [(lat, lng) for lng, lat in coords]
        props = feature["properties"]

        popup_html = (
            f"{props.get('name') or '(이름 없음)'}<br>"
            f"highway: {props.get('highway')}<br>"
            f"length: {props.get('length')}m"
        )

        folium.PolyLine(
            locations=locations,
            color="#888888",
            weight=2,
            opacity=0.7,
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


def main() -> None:
    with open(ROADS_GEOJSON, encoding="utf-8") as f:
        roads_geojson = json.load(f)
    with open(CCTV_GEOJSON, encoding="utf-8") as f:
        cctv_geojson = json.load(f)

    m = folium.Map(location=HYEHWA_CENTER, zoom_start=16, tiles="OpenStreetMap")

    edge_count = add_roads(m, roads_geojson)
    marker_count = add_cctv(m, cctv_geojson)

    OUT_HTML.parent.mkdir(parents=True, exist_ok=True)
    m.save(str(OUT_HTML))
    print(f"저장 완료: {OUT_HTML} (도로 {edge_count}개, CCTV {marker_count}개)")


if __name__ == "__main__":
    main()
