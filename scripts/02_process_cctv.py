"""raw CCTV 현황 CSV -> public/data/cctv.geojson 변환"""
import json
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
RAW_CSV = ROOT / "raw" / "종로구_CCTV_현황_250226.csv"
OUT_PATH = ROOT / "public" / "data" / "cctv.geojson"

# CLAUDE.md 대상 지역 bbox
LAT_MIN, LAT_MAX = 37.575, 37.596
LNG_MIN, LNG_MAX = 126.993, 127.010

EXPECTED_COUNT = 184
EXPECTED_RANGE = (180, 188)
EXPECTED_PURPOSE_DIST = {
    "방범": 135,
    "주정차": 28,
    "공원": 20,
    "국가유산방범": 1,
}

PROPERTY_MAP = {
    "설치목적구분": "purpose",
    "카메라대수": "cameraCount",
    "카메라화소수": "resolution",
    "촬영방면정보": "direction",
    "보관일수": "retentionDays",
    "설치년월": "installedAt",
    "소재지도로명주소": "roadAddress",
    "소재지지번주소": "lotAddress",
    "관리기관명": "agency",
    "관리기관번호": "agencyPhone",
}


def coverage_radius(direction: str, camera_count: int) -> int:
    radius = 40 if direction == "360도 전방면" else 30
    if camera_count >= 2:
        radius += 10
    return radius


def main() -> None:
    df = pd.read_csv(RAW_CSV, encoding="cp949")

    in_bbox = (
        df["위도"].between(LAT_MIN, LAT_MAX)
        & df["경도"].between(LNG_MIN, LNG_MAX)
    )
    filtered = df[in_bbox].copy()

    count = len(filtered)
    print(f"필터링된 CCTV 개수: {count}")
    if not (EXPECTED_RANGE[0] <= count <= EXPECTED_RANGE[1]):
        raise SystemExit(
            f"[검증 실패] CCTV 개수 {count}건이 기대 범위 {EXPECTED_RANGE} 밖입니다. "
            "bbox 또는 필터 로직을 확인하세요."
        )

    purpose_counts = filtered["설치목적구분"].value_counts().to_dict()
    print("purpose별 개수 분포:")
    for purpose, expected in EXPECTED_PURPOSE_DIST.items():
        actual = purpose_counts.get(purpose, 0)
        flag = "OK" if actual == expected else "MISMATCH"
        print(f"  {purpose}: {actual} (기대 {expected}) [{flag}]")
    others = {k: v for k, v in purpose_counts.items() if k not in EXPECTED_PURPOSE_DIST}
    if others:
        print(f"  기타: {others}")

    features = []
    for _, row in filtered.iterrows():
        properties = {
            eng: row[kor] for kor, eng in PROPERTY_MAP.items()
        }
        properties["coverageRadius"] = coverage_radius(
            row["촬영방면정보"], int(row["카메라대수"])
        )

        # numpy 스칼라 -> 파이썬 기본 타입, 결측치(NaN) -> null
        for key, value in properties.items():
            if pd.isna(value):
                properties[key] = None
            elif hasattr(value, "item"):
                properties[key] = value.item()

        # 보관일수는 결측치로 인해 float64로 읽히지만 실제 값은 정수
        if properties["retentionDays"] is not None:
            properties["retentionDays"] = int(properties["retentionDays"])

        features.append(
            {
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [float(row["경도"]), float(row["위도"])],
                },
                "properties": properties,
            }
        )

    geojson = {"type": "FeatureCollection", "features": features}

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUT_PATH, "w", encoding="utf-8") as f:
        json.dump(geojson, f, ensure_ascii=False, indent=2)

    print(f"저장 완료: {OUT_PATH} ({len(features)}개 피처)")


if __name__ == "__main__":
    main()
