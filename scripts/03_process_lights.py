"""보안등(xlsx) + 가로등(csv) 두 소스를 병합해 public/data/lights.geojson 생성"""
import json
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
SECURITY_XLSX = ROOT / "raw" / "종로구_보안등_현황_250225.xlsx"
STREET_CSV = ROOT / "raw" / "서울시 가로등 위치 정보.csv"
OUT_PATH = ROOT / "public" / "data" / "lights.geojson"

# CLAUDE.md 대상 지역 bbox
LAT_MIN, LAT_MAX = 37.575, 37.596
LNG_MIN, LNG_MAX = 126.993, 127.010

# 대한민국 영역 밖 불량 좌표 필터 범위
KOREA_LAT_MIN, KOREA_LAT_MAX = 33, 39
KOREA_LNG_MIN, KOREA_LNG_MAX = 124, 132

EXPECTED_SECURITY_RANGE = (1800, 1810)
EXPECTED_SECURITY_COUNT = 1806
EXPECTED_STREET_COUNT = 0


def clean(value):
    if pd.isna(value):
        return None
    if hasattr(value, "item"):
        return value.item()
    return value


def in_korea(df: pd.DataFrame) -> pd.Series:
    return df["위도"].between(KOREA_LAT_MIN, KOREA_LAT_MAX) & df["경도"].between(
        KOREA_LNG_MIN, KOREA_LNG_MAX
    )


def in_hyehwa_bbox(df: pd.DataFrame) -> pd.Series:
    return df["위도"].between(LAT_MIN, LAT_MAX) & df["경도"].between(LNG_MIN, LNG_MAX)


def to_point_feature(lng: float, lat: float, properties: dict) -> dict:
    return {
        "type": "Feature",
        "geometry": {"type": "Point", "coordinates": [lng, lat]},
        "properties": properties,
    }


def process_security_lights() -> list[dict]:
    df = pd.read_excel(SECURITY_XLSX, engine="openpyxl")

    valid_mask = in_korea(df)
    dropped = df[~valid_mask]
    print(f"[보안등] 불량 좌표 드롭: {len(dropped)}건")
    for _, row in dropped.iterrows():
        print(f"  - {row['표찰번호']} (위도={row['위도']}, 경도={row['경도']})")

    df = df[valid_mask]
    df = df[in_hyehwa_bbox(df)]

    count = len(df)
    print(f"[보안등] 혜화 bbox 내: {count}건 (기대 {EXPECTED_SECURITY_COUNT})")
    if not (EXPECTED_SECURITY_RANGE[0] <= count <= EXPECTED_SECURITY_RANGE[1]):
        raise SystemExit(
            f"[검증 실패] 보안등 개수 {count}건이 기대 범위 {EXPECTED_SECURITY_RANGE} 밖입니다. "
            "필터 로직을 확인하세요."
        )

    features = []
    for _, row in df.iterrows():
        properties = {
            "type": "security",
            "id": clean(row["표찰번호"]),
            "lampType": clean(row["램프종류"]),
            "poleType": clean(row["등주형태"]),
            "dong": clean(row["법정동"]),
            "roadName": clean(row["도로명"]),
        }
        features.append(to_point_feature(row["경도"], row["위도"], properties))
    return features


def process_street_lights() -> list[dict]:
    df = pd.read_csv(STREET_CSV, encoding="cp949")

    valid_mask = in_korea(df)
    dropped_count = (~valid_mask).sum()
    print(f"[가로등] 불량 좌표 드롭: {dropped_count}건")

    df = df[valid_mask]
    df = df[in_hyehwa_bbox(df)]

    count = len(df)
    if count == 0:
        print(f"[가로등] 혜화 bbox 내: 0건 — 보안등 단독 사용 (기대 {EXPECTED_STREET_COUNT})")
        return []

    print(f"[가로등] 혜화 bbox 내: {count}건 (기대 {EXPECTED_STREET_COUNT})")

    features = []
    for _, row in df.iterrows():
        properties = {"type": "street", "id": clean(row["관리번호"])}
        features.append(to_point_feature(row["경도"], row["위도"], properties))
    return features


def main() -> None:
    security_features = process_security_lights()
    street_features = process_street_lights()

    features = security_features + street_features
    geojson = {"type": "FeatureCollection", "features": features}

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUT_PATH, "w", encoding="utf-8") as f:
        json.dump(geojson, f, ensure_ascii=False, indent=2)

    print(
        f"저장 완료: {OUT_PATH} "
        f"(보안등 {len(security_features)}개 + 가로등 {len(street_features)}개 "
        f"= 총 {len(features)}개)"
    )


if __name__ == "__main__":
    main()
