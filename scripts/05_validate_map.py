"""public/data/cctv.geojson 위치/커버리지 반경 시각 검증용 folium 지도 생성"""
import json
from pathlib import Path

import folium

ROOT = Path(__file__).resolve().parent.parent
CCTV_GEOJSON = ROOT / "public" / "data" / "cctv.geojson"
OUT_HTML = ROOT / "scripts" / "validate_cctv.html"

HYEHWA_CENTER = (37.586, 127.001)


def main() -> None:
    with open(CCTV_GEOJSON, encoding="utf-8") as f:
        geojson = json.load(f)

    m = folium.Map(location=HYEHWA_CENTER, zoom_start=16, tiles="OpenStreetMap")

    for feature in geojson["features"]:
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

    OUT_HTML.parent.mkdir(parents=True, exist_ok=True)
    m.save(str(OUT_HTML))
    print(f"저장 완료: {OUT_HTML} ({len(geojson['features'])}개 마커)")


if __name__ == "__main__":
    main()
