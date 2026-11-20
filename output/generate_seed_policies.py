"""Generates backend/src/main/resources/db/migration/V2__seed_policies.sql.

Deterministic (fixed RNG seed). Re-run with:
    python3 -I output/generate_seed_policies.py
"""
import random
from collections import Counter
from pathlib import Path

rng = random.Random(20260101)
N = 210
OUT = Path(__file__).resolve().parents[1] / "backend/src/main/resources/db/migration/V2__seed_policies.sql"

STATUS_COUNTS = [("ACTIVE", 94), ("EXPIRED", 63), ("PENDING", 32), ("CANCELLED", 21)]
LOB_COUNTS = [("PROPERTY", 53), ("CASUALTY", 53), ("AH", 52), ("MARINE", 52)]
REGIONS = [
    ("Singapore", "SGD"), ("Hong Kong", "HKD"), ("Australia", "AUD"), ("Japan", "JPY"),
    ("Thailand", "THB"), ("Indonesia", "USD"), ("Malaysia", "USD"), ("Philippines", "USD"),
]
CURRENCY = dict(REGIONS)

# premium lognormal (median, sigma) per LOB, clamped to 1,000 .. 5,000,000
PREMIUM = {"PROPERTY": (60_000, 1.0), "CASUALTY": (30_000, 1.0), "AH": (5_000, 0.9), "MARINE": (150_000, 1.1)}
CORPORATE_PROB = {"PROPERTY": 0.4, "CASUALTY": 0.4, "AH": 0.1, "MARINE": 0.6}

# (weight, first-part list, second-part list)
INDIVIDUAL = {
    "Singapore": [
        (0.65, ["Tan", "Lim", "Lee", "Ng", "Goh", "Teo", "Chua", "Ong"],
               ["Wei Jie", "Hui Min", "Jun Hao", "Mei Xin", "Kai Wen", "Li Ting", "Zhi Hao", "Shu Fen"]),
        (0.20, ["Muhammad Faris bin", "Ahmad Hakim bin", "Irfan bin", "Syafiq bin",
                "Nurul Aisyah binti", "Siti Nabilah binti", "Farah binti", "Hidayah binti"],
               ["Abdullah", "Rahim", "Salleh", "Osman", "Yusof", "Hamid"]),
        (0.15, ["Rajan", "Suresh", "Priya", "Kavitha", "Arun", "Deepa"],
               ["Pillai", "Nair", "Menon", "Krishnan", "Subramaniam", "Naidu"]),
    ],
    "Hong Kong": [
        (1.0, ["Chan", "Wong", "Lee", "Cheung", "Lau", "Ng", "Leung", "Ho", "Chow", "Yip", "Lam", "Tsang", "Yeung", "Kwok", "Fung"],
              ["Tai Man", "Siu Ming", "Ka Yan", "Wing Kei", "Mei Ling", "Chi Keung", "Hoi Ying", "Wai Man",
               "Kar Wai", "Sze Wing", "Man Yee", "Ka Ho", "Pui Shan", "Yuk Lan", "Chun Kit"]),
    ],
    "Australia": [
        (1.0, ["Oliver", "Jack", "William", "Charlotte", "Amelia", "Isla", "Liam", "Noah", "Mia", "Ethan",
               "Grace", "Lucas", "Hannah", "Mitchell", "Sophie", "Lachlan", "Chloe", "Hamish", "Zoe", "Riley"],
              ["Thompson", "Walker", "Mitchell", "Campbell", "Anderson", "Taylor", "Murray", "Stewart",
               "Robertson", "Kelly", "Hughes", "Fraser", "Henderson", "Cooper", "Bennett"]),
    ],
    # "Tanaka" and "Hiroshi" are deliberately absent: Tanaka Hiroshi must be the only match for the search test.
    "Japan": [
        (1.0, ["Sato", "Suzuki", "Takahashi", "Watanabe", "Ito", "Yamamoto", "Nakamura", "Kobayashi", "Kato",
               "Yoshida", "Yamada", "Sasaki", "Matsumoto", "Inoue", "Kimura", "Hayashi", "Shimizu", "Yamazaki",
               "Mori", "Abe", "Ikeda", "Hashimoto", "Ishikawa", "Ogawa", "Goto"],
              ["Kenji", "Takeshi", "Yuki", "Haruto", "Akira", "Daisuke", "Kazuo", "Naoki", "Satoshi", "Masashi",
               "Yuko", "Keiko", "Sakura", "Yui", "Emi", "Aiko", "Mariko", "Noriko", "Ryo", "Shota", "Koji",
               "Tomoko", "Hana", "Miyuki", "Taro"]),
    ],
    "Thailand": [
        (1.0, ["Somchai", "Somsak", "Prasert", "Anan", "Wichai", "Suda", "Malee", "Naree", "Kanya", "Pranee",
               "Nattapong", "Sirichai", "Pornthip", "Apinya", "Chatchai", "Kritsada", "Ratchanee", "Thanakorn",
               "Supaporn", "Wanchai"],
              ["Wongsakul", "Srisai", "Chaiyaporn", "Thongchai", "Rattanakul", "Boonmee", "Jaidee", "Sukhum",
               "Pattanakul", "Charoenwong", "Saetang", "Phromma"]),
    ],
    "Indonesia": [
        (1.0, ["Budi", "Agus", "Siti", "Dewi", "Rina", "Eko", "Hendra", "Wahyu", "Putri", "Ahmad", "Rizky",
               "Dian", "Yuliani", "Bambang", "Ayu", "Indra", "Fajar", "Sri", "Joko"],
              ["Santoso", "Wijaya", "Pratama", "Hidayat", "Saputra", "Kusuma", "Nugroho", "Susanto", "Rahayu",
               "Setiawan", "Firmansyah", "Purnomo", "Gunawan", "Hakim", "Lestari"]),
    ],
    "Malaysia": [
        (0.40, ["Ahmad bin", "Mohd Faizal bin", "Hafiz bin", "Azman bin"],
               ["Ismail", "Abdullah", "Hassan", "Yusof", "Rahman", "Ibrahim", "Omar", "Zainal"]),
        (0.15, ["Siti Aminah binti", "Nurul Huda binti", "Farah binti", "Aisyah binti"],
               ["Ismail", "Abdullah", "Hassan", "Yusof", "Rahman", "Ibrahim", "Omar", "Zainal"]),
        (0.30, ["Tan", "Lim", "Lee", "Wong", "Ng", "Chong", "Teoh", "Goh"],
               ["Wei Ming", "Mei Ling", "Jia Hui", "Kok Leong", "Siew Fong", "Chee Keong", "Yee Ling", "Boon Hock"]),
        (0.15, ["Rajesh Kumar a/l", "Priya a/p", "Suresh a/l", "Kavitha a/p", "Vijay a/l", "Lakshmi a/p"],
               ["Subramaniam", "Krishnan", "Muniandy", "Ramasamy", "Nair", "Pillai"]),
    ],
    "Philippines": [
        (1.0, ["Maria", "Jose", "Juan", "Ana", "Carlo", "Rosario", "Miguel", "Angelica", "Ramon", "Teresa",
               "Gabriel", "Cristina", "Paolo", "Liza", "Eduardo", "Beatriz", "Antonio", "Mariel", "Rafael", "Jasmine"],
              ["Santos", "Reyes", "Cruz", "Bautista", "Garcia", "Mendoza", "Torres", "Flores", "Villanueva",
               "Ramos", "Aquino", "Castillo", "dela Cruz", "Navarro", "Domingo"]),
    ],
}

# (template, prefixes, industries)
CORPORATE = {
    "Singapore": ("{p} {i} Pte Ltd", ["Marina Bay", "Jurong", "Raffles", "Orchard", "Changi", "Sentosa", "Tampines"],
                  ["Logistics", "Engineering", "Trading", "Holdings", "Shipping", "Foods"]),
    "Hong Kong": ("{p} {i} Limited", ["Harbour", "Kowloon", "Victoria", "Lantau", "Pearl", "Dragon", "Central"],
                  ["Trading", "Shipping", "Logistics", "Holdings", "Textiles", "Electronics"]),
    "Australia": ("{p} {i} Pty Ltd", ["Sunshine", "Murray River", "Southern Cross", "Harbour City", "Outback",
                                      "Coral Coast", "Blue Mountains", "Gold Coast"],
                  ["Mining", "Agri", "Logistics", "Construction", "Marine Services", "Wine"]),
    "Japan": ("{p} {i} Co., Ltd.", ["Sakura", "Fuji", "Nippon", "Tokyo", "Osaka", "Yokohama", "Kyoto", "Nagoya", "Kobe", "Hokkaido"],
              ["Trading", "Shipping", "Electronics", "Foods", "Logistics", "Steel", "Chemical", "Marine Transport"]),
    "Thailand": ("{p} {i} Co., Ltd.", ["Siam", "Chao Phraya", "Bangkok", "Phuket", "Andaman", "Lanna", "Isan", "Thai"],
                 ["Rubber", "Rice Export", "Logistics", "Textile", "Seafood", "Marine Services"]),
    "Indonesia": ("PT {p} {i}", ["Nusantara", "Garuda", "Borneo", "Jawa", "Sumatera", "Bali", "Surabaya", "Mahakam", "Kalimantan"],
                  ["Maritim", "Logistik", "Tambang", "Agro", "Konstruksi", "Pangan", "Energi"]),
    "Malaysia": ("{p} {i} Sdn Bhd", ["Selangor", "Penang", "Johor", "Kuala Lumpur", "Sarawak", "Melaka", "Perak", "Sabah"],
                 ["Plantation", "Logistics", "Trading", "Engineering", "Marine", "Holdings"]),
    "Philippines": ("{p} {i} Corporation", ["Manila", "Cebu", "Mindanao", "Luzon", "Pacific", "Visayas", "Davao", "Subic"],
                    ["Shipping", "Trading", "Agri", "Construction", "Logistics", "Holdings"]),
}

UNDERWRITERS = {
    "Singapore": ["Evelyn Koh", "Daniel Tay", "Priyanka Nair", "Marcus Yeo"],
    "Hong Kong": ["Vivian Chu", "Kevin Ma", "Irene Yau", "Jason Tse"],
    "Australia": ["Rebecca Hall", "Andrew Pearce", "Natalie Ross", "Dean Whitfield"],
    "Japan": ["Mori Yumi", "Hasegawa Ken", "Fujita Naoko", "Okada Shinji"],
    "Thailand": ["Kanokwan Siri", "Pichit Anan", "Orawan Petch", "Teerapong Lek"],
    "Indonesia": ["Anita Wibowo", "Rudi Hartono", "Maya Kartika", "Dimas Aditya"],
    "Malaysia": ["Farhana Zulkifli", "Lee Chun Wei", "Arvind Raj", "Nadia Kamal"],
    "Philippines": ["Patricia Lim", "Marco Dizon", "Isabel Tan", "Gerard Salazar"],
}

used_names = {"Tanaka Hiroshi"}


def gen_name(region, lob):
    if rng.random() < CORPORATE_PROB[lob]:
        template, prefixes, industries = CORPORATE[region]
        for _ in range(50):
            name = template.format(p=rng.choice(prefixes), i=rng.choice(industries))
            if name not in used_names:
                used_names.add(name)
                return name
    pools = INDIVIDUAL[region]
    while True:
        _, a, b = rng.choices(pools, weights=[p[0] for p in pools])[0]
        name = f"{rng.choice(a)} {rng.choice(b)}"
        if name not in used_names:
            used_names.add(name)
            return name


def sql_date(offset):
    if offset == 0:
        return "CURRENT_DATE"
    return f"CURRENT_DATE + {offset}" if offset > 0 else f"CURRENT_DATE - {-offset}"


def lit(s):
    return "'" + s.replace("'", "''") + "'"


# --- assign status / LOB / region independently, then shuffle -------------------------
statuses = [s for s, n in STATUS_COUNTS for _ in range(n)]
lobs = [l for l, n in LOB_COUNTS for _ in range(n)]
regions = [r for r, _ in (REGIONS * 27)[:N]]
for lst in (statuses, lobs, regions):
    rng.shuffle(lst)
assert len(statuses) == len(lobs) == len(regions) == N

# --- dates: expiry offsets relative to CURRENT_DATE ----------------------------------
# Exactly 14 policies (all ACTIVE) expire within 30 days; no other status may land in that window.
active_idx = [i for i, s in enumerate(statuses) if s == "ACTIVE"]
soon = set(rng.sample(active_idx, 14))
soon_offsets = rng.sample(range(1, 31), 14)

rows = []
soon_iter = iter(soon_offsets)
for i in range(N):
    st = statuses[i]
    if st == "ACTIVE":
        exp = next(soon_iter) if i in soon else rng.randint(31, 700)
        term = 365 if exp <= 365 else 730
    elif st == "EXPIRED":
        exp, term = -rng.randint(1, 540), 365
    elif st == "PENDING":
        eff = rng.randint(3, 75)
        exp, term = eff + 365, 365
    else:  # CANCELLED: mid-term, expiry either already passed or well beyond 30 days
        exp = -rng.randint(5, 400) if rng.random() < 0.5 else rng.randint(31, 330)
        term = 365
    rows.append({"status": st, "lob": lobs[i], "region": regions[i], "exp": exp, "eff": exp - term})

# --- premiums, names, underwriters -----------------------------------------------------
for r in rows:
    median, sigma = PREMIUM[r["lob"]]
    p = min(max(rng.lognormvariate(0, sigma) * median, 1_000), 5_000_000)
    r["premium"] = round(p / 10) * 10
    r["currency"] = CURRENCY[r["region"]]
    r["underwriter"] = rng.choice(UNDERWRITERS[r["region"]])

# Pin the range extremes so the full 1,000 .. 5,000,000 span is present.
max(((r) for r in rows if r["lob"] == "MARINE"), key=lambda r: r["premium"])["premium"] = 5_000_000
min(((r) for r in rows if r["lob"] == "AH"), key=lambda r: r["premium"])["premium"] = 1_000

# Tanaka Hiroshi: first Active Japan record, individual, used by the search test.
tanaka = next(r for r in rows if r["region"] == "Japan" and r["status"] == "ACTIVE")
tanaka["name"] = "Tanaka Hiroshi"
for r in rows:
    if "name" not in r:
        r["name"] = gen_name(r["region"], r["lob"])

# --- sanity checks -------------------------------------------------------------------
assert sum(1 for r in rows if 1 <= r["exp"] <= 30) == 14
assert all(r["status"] == "ACTIVE" for r in rows if 1 <= r["exp"] <= 30)
assert all(r["exp"] > 0 for r in rows if r["status"] == "ACTIVE")
assert all(r["exp"] < 0 for r in rows if r["status"] == "EXPIRED")
assert all(1_000 <= r["premium"] <= 5_000_000 for r in rows)
assert all(r["eff"] < r["exp"] for r in rows)
assert len({r["name"] for r in rows}) == N
assert sum("Tanaka" in r["name"] or "Hiroshi" in r["name"] for r in rows) == 1

# --- emit ----------------------------------------------------------------------------
lines = [
    "-- Seed data: 210 policies across 8 APAC regions.",
    "-- Dates are relative to CURRENT_DATE so the data never goes stale.",
    "-- Generated by output/generate_seed_policies.py (deterministic).",
    "",
]
for n, r in enumerate(rows, start=1):
    lines.append(
        "INSERT INTO policies (policy_number, policyholder_name, line_of_business, status, premium_amount, "
        "currency, effective_date, expiry_date, region, underwriter) VALUES ("
        f"{lit('POL-%06d' % n)}, {lit(r['name'])}, {lit(r['lob'])}, {lit(r['status'])}, {r['premium']:.2f}, "
        f"{lit(r['currency'])}, {sql_date(r['eff'])}, {sql_date(r['exp'])}, {lit(r['region'])}, {lit(r['underwriter'])});"
    )
OUT.write_text("\n".join(lines) + "\n", encoding="utf-8")

print("wrote", OUT, len(rows), "rows")
for label, key in (("status", "status"), ("lob", "lob"), ("region", "region")):
    print(label, dict(Counter(r[key] for r in rows)))
print("currency", dict(Counter(r["currency"] for r in rows)))
print("premium min/max", min(r["premium"] for r in rows), max(r["premium"] for r in rows))
