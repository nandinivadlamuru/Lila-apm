"""
One-shot parquet → JSON for Lila APM frontend.
Place next to player_data/ (February_10 … February_14) and run: python convert.py
Requires: pip install pyarrow pandas
"""
import json
import os

import pandas as pd
import pyarrow.parquet as pq

DATA_ROOT = "player_data"
OUTPUT_DIR = "public/data"

DAYS = [
    "February_10",
    "February_11",
    "February_12",
    "February_13",
    "February_14",
]

MAP_CONFIG = {
    "AmbroseValley": {"scale": 900, "origin_x": -370, "origin_z": -473},
    "GrandRift": {"scale": 581, "origin_x": -290, "origin_z": -290},
    "Lockdown": {"scale": 1000, "origin_x": -500, "origin_z": -500},
}

COMBAT_LOOT_EVENTS = {
    "Kill",
    "Killed",
    "BotKill",
    "BotKilled",
    "KilledByStorm",
    "Loot",
}
MOVEMENT_EVENTS = {"Position", "BotPosition"}

MAP_NAME_TO_FILE = {
    "AmbroseValley": "ambrosevalley",
    "GrandRift": "grandrift",
    "Lockdown": "lockdown",
}


def is_bot(user_id: str) -> bool:
    return str(user_id).strip().isnumeric()


def decode_event(e):
    if isinstance(e, bytes):
        return e.decode("utf-8")
    return str(e)


def add_pixel_columns(df: pd.DataFrame) -> pd.DataFrame:
    out = df.copy()
    out["pixel_x"] = float("nan")
    out["pixel_y"] = float("nan")
    for mid, cfg in MAP_CONFIG.items():
        m = out["map_id"] == mid
        if not m.any():
            continue
        ox, oz, sc = cfg["origin_x"], cfg["origin_z"], cfg["scale"]
        u = (out.loc[m, "x"] - ox) / sc
        v = (out.loc[m, "z"] - oz) / sc
        out.loc[m, "pixel_x"] = (u * 1024).round(2)
        out.loc[m, "pixel_y"] = ((1 - v) * 1024).round(2)
    return out


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    all_frames = []
    total_files = 0
    skipped = 0

    for day in DAYS:
        day_path = os.path.join(DATA_ROOT, day)
        if not os.path.isdir(day_path):
            print(f"  [SKIP] Folder not found: {day_path}")
            continue

        files = [f for f in os.listdir(day_path) if not f.startswith(".")]
        print(f"Loading {day} — {len(files)} files...")

        for filename in files:
            filepath = os.path.join(day_path, filename)
            if os.path.isdir(filepath):
                continue
            try:
                table = pq.read_table(filepath)
                frame = table.to_pandas()
                frame["event"] = frame["event"].apply(decode_event)
                frame["is_bot"] = frame["user_id"].apply(is_bot)
                frame["day"] = day
                frame["date"] = day.replace("February_", "Feb ")
                all_frames.append(frame)
                total_files += 1
            except Exception as e:
                print(f"  [ERROR] {filename}: {e}")
                skipped += 1

    if not all_frames:
        print(
            "\nNo parquet files loaded. Put `player_data/` next to this script "
            f"(expected path: {os.path.abspath(DATA_ROOT)}) and try again."
        )
        return

    print(f"\nLoaded {total_files} files, skipped {skipped}")
    print("Combining all data...")
    full_df = pd.concat(all_frames, ignore_index=True)
    print(f"Total rows: {len(full_df):,}")
    print(f"Maps found: {full_df['map_id'].unique().tolist()}")
    print(f"Event types: {sorted(full_df['event'].unique().tolist())}")

    print("Computing pixel coordinates...")
    full_df = add_pixel_columns(full_df)
    full_df = full_df.dropna(subset=["pixel_x", "pixel_y"])

    full_df["ts_ms"] = pd.to_datetime(full_df["ts"], errors="coerce").astype(
        "int64"
    ) // 1_000_000

    combat_df = full_df[full_df["event"].isin(COMBAT_LOOT_EVENTS)].copy()
    movement_df = full_df[full_df["event"].isin(MOVEMENT_EVENTS)].iloc[::5].copy()

    print(f"\nCombat/loot rows: {len(combat_df):,}")
    print(f"Movement rows (sampled every 5th): {len(movement_df):,}")

    COMBAT_COLS = [
        "user_id",
        "match_id",
        "map_id",
        "event",
        "is_bot",
        "pixel_x",
        "pixel_y",
        "ts_ms",
        "date",
        "x",
        "z",
    ]
    MOVEMENT_COLS = [
        "user_id",
        "match_id",
        "map_id",
        "event",
        "is_bot",
        "pixel_x",
        "pixel_y",
        "ts_ms",
        "date",
    ]

    for map_id, slug in MAP_NAME_TO_FILE.items():
        print(f"\nExporting {map_id}...")
        c_df = combat_df[combat_df["map_id"] == map_id][COMBAT_COLS]
        c_path = os.path.join(OUTPUT_DIR, f"{slug}_events.json")
        c_df.to_json(c_path, orient="records")
        print(f"  OK {slug}_events.json — {len(c_df):,} rows")

        m_df = movement_df[movement_df["map_id"] == map_id][MOVEMENT_COLS]
        m_path = os.path.join(OUTPUT_DIR, f"{slug}_movement.json")
        m_df.to_json(m_path, orient="records")
        print(f"  OK {slug}_movement.json — {len(m_df):,} rows")

    print("\nBuilding summary index...")
    summary = {}
    for map_id in MAP_NAME_TO_FILE:
        map_df = full_df[full_df["map_id"] == map_id]
        matches = []
        for match_id, grp in map_df.groupby("match_id"):
            humans = grp.loc[~grp["is_bot"], "user_id"].nunique()
            bots = grp.loc[grp["is_bot"], "user_id"].nunique()
            matches.append(
                {
                    "match_id": match_id,
                    "date": grp["date"].iloc[0],
                    "day": grp["day"].iloc[0],
                    "num_humans": int(humans),
                    "num_bots": int(bots),
                    "total_events": int(len(grp)),
                    "ts_start": int(grp["ts_ms"].min()),
                    "ts_end": int(grp["ts_ms"].max()),
                }
            )
        summary[map_id] = {
            "matches": matches,
            "total_events": int(len(map_df)),
            "dates": sorted(map_df["date"].unique().tolist()),
        }

    summary_path = os.path.join(OUTPUT_DIR, "summary.json")
    with open(summary_path, "w", encoding="utf-8") as f:
        json.dump(summary, f)
    n_matches = sum(len(v["matches"]) for v in summary.values())
    print(f"  OK summary.json — {n_matches} matches indexed")
    print(f"\nDone. Output: {os.path.abspath(OUTPUT_DIR)}")


if __name__ == "__main__":
    main()
