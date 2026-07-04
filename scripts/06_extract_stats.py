"""서울시 공식 CCTV 통계 3종(자치구별 xlsx)에서 종로구 행을 추출해 public/data/stats.json 생성"""
import json
import re
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
STATS_DIR = ROOT / "raw" / "stats"
CCTV_GEOJSON = ROOT / "public" / "data" / "cctv.geojson"
LIGHTS_GEOJSON = ROOT / "public" / "data" / "lights.geojson"
OUT_PATH = ROOT / "public" / "data" / "stats.json"

DISTRICT = "종로구"
AS_OF = "2025-12-31"
RETENTION_DAYS = 30

EXPECTED = {
    "totalCctv": 3125,
    "crimePreventionCctv": 2885,
    "방범": 1882,
    "어린이보호구역": 105,
    "공원놀이터": 898,
    "yearlyTrend_2015": 935,
    "yearlyTrend_2025": 2885,
    "smartMonitored": 3125,
    "smartTotal": 3125,
}


def find_district_row(df: pd.DataFrame, name_value: str = DISTRICT):
    """'종로구' 문자열이 들어있는 셀의 (row, col) 위치를 찾는다."""
    for row_idx in range(len(df)):
        row = df.iloc[row_idx]
        for col_idx, value in enumerate(row):
            if isinstance(value, str) and value.strip() == name_value:
                return row_idx, col_idx
    raise SystemExit(f"[추출 실패] '{name_value}' 행을 찾지 못했습니다.")


def extract_purpose(path: Path) -> dict:
    df = pd.read_excel(path, header=None, engine="openpyxl")
    row_idx, name_col = find_district_row(df)
    row = df.iloc[row_idx]
    return {
        "totalCctv": int(row[name_col + 1]),
        "crimePreventionCctv": int(row[name_col + 2]),
        "방범": int(row[name_col + 3]),
        "어린이보호구역": int(row[name_col + 4]),
        "공원놀이터": int(row[name_col + 5]),
    }


def extract_crime_trend(path: Path) -> dict:
    df = pd.read_excel(path, header=None, engine="openpyxl")
    row_idx, name_col = find_district_row(df)

    # 헤더 행에서 "YYYY년" 패턴을 찾아 열 인덱스 -> 연도로 매핑
    header_row = None
    for i in range(row_idx):
        candidates = [
            re.match(r"(\d{4})년", str(v)) for v in df.iloc[i]
        ]
        if sum(1 for c in candidates if c) >= 5:
            header_row = df.iloc[i]
            break
    if header_row is None:
        raise SystemExit("[추출 실패] 연도 헤더 행을 찾지 못했습니다.")

    year_cols = {}
    for col_idx, value in enumerate(header_row):
        match = re.match(r"(\d{4})년", str(value))
        if match:
            year_cols[match.group(1)] = col_idx

    data_row = df.iloc[row_idx]
    return {year: int(data_row[col_idx]) for year, col_idx in sorted(year_cols.items())}


def extract_smart(path: Path) -> dict:
    df = pd.read_excel(path, header=None, engine="openpyxl")
    row_idx, name_col = find_district_row(df)
    row = df.iloc[row_idx]
    return {
        "monitored": int(row[name_col + 1]),
        "total": int(row[name_col + 2]),
    }


def count_geojson_features(path: Path, predicate=None) -> int:
    with open(path, encoding="utf-8") as f:
        geojson = json.load(f)
    features = geojson["features"]
    if predicate is None:
        return len(features)
    return sum(1 for f in features if predicate(f))


def verify(label: str, actual, expected) -> bool:
    ok = actual == expected
    status = "OK" if ok else "MISMATCH"
    print(f"  {label}: {actual} (기대 {expected}) [{status}]")
    return ok


def main() -> None:
    purpose = extract_purpose(STATS_DIR / "seoul_cctv_purpose.xlsx")
    yearly_trend = extract_crime_trend(STATS_DIR / "seoul_cctv_crime.xlsx")
    smart = extract_smart(STATS_DIR / "seoul_cctv_smart.xlsx")

    print("=== 종로구 통계 추출 검증 ===")
    all_ok = True
    all_ok &= verify("CCTV 총계", purpose["totalCctv"], EXPECTED["totalCctv"])
    all_ok &= verify(
        "범죄예방 소계", purpose["crimePreventionCctv"], EXPECTED["crimePreventionCctv"]
    )
    all_ok &= verify("방범", purpose["방범"], EXPECTED["방범"])
    all_ok &= verify("어린이보호구역", purpose["어린이보호구역"], EXPECTED["어린이보호구역"])
    all_ok &= verify("공원·놀이터", purpose["공원놀이터"], EXPECTED["공원놀이터"])
    all_ok &= verify("연도별 추이 2015년", yearly_trend.get("2015"), EXPECTED["yearlyTrend_2015"])
    all_ok &= verify("연도별 추이 2025년", yearly_trend.get("2025"), EXPECTED["yearlyTrend_2025"])
    all_ok &= verify("관제수량", smart["monitored"], EXPECTED["smartMonitored"])
    all_ok &= verify("지능형 계", smart["total"], EXPECTED["smartTotal"])

    if not all_ok:
        raise SystemExit("[검증 실패] 위 MISMATCH 항목을 확인하고 파싱 로직을 점검하세요.")

    hyehwa_cctv = count_geojson_features(CCTV_GEOJSON)
    hyehwa_lights = count_geojson_features(
        LIGHTS_GEOJSON, predicate=lambda f: f["properties"].get("type") == "security"
    )
    print(f"  혜화 CCTV: {hyehwa_cctv} / 혜화 보안등: {hyehwa_lights}")

    smart_ratio = round(smart["monitored"] / smart["total"], 4) if smart["total"] else 0.0

    stats = {
        "asOf": AS_OF,
        "district": DISTRICT,
        "totalCctv": purpose["totalCctv"],
        "crimePreventionCctv": purpose["crimePreventionCctv"],
        "byPurpose": {
            "방범": purpose["방범"],
            "어린이보호구역": purpose["어린이보호구역"],
            "공원놀이터": purpose["공원놀이터"],
        },
        "yearlyTrend": yearly_trend,
        "smartMonitored": smart["monitored"],
        "smartRatio": smart_ratio,
        "hyehwaCctv": hyehwa_cctv,
        "hyehwaLights": hyehwa_lights,
        "retentionDays": RETENTION_DAYS,
    }

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUT_PATH, "w", encoding="utf-8") as f:
        json.dump(stats, f, ensure_ascii=False, indent=2)

    size_bytes = OUT_PATH.stat().st_size
    print(f"저장 완료: {OUT_PATH} ({size_bytes}bytes)")
    if size_bytes >= 2048:
        print(f"[경고] stats.json 크기가 2KB 이상입니다 ({size_bytes}bytes).")


if __name__ == "__main__":
    main()
