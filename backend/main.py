import csv
import json
import os
from collections import defaultdict
from pathlib import Path
from typing import Any

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
try:
    import pandas as pd
except Exception:  # pragma: no cover - optional dependency in lightweight environments
    pd = None

YEARS = list(range(2010, 2018))
TOTAL_PATIENTS = 5_000_000
PROJECT_ROOT = Path(__file__).resolve().parent.parent
# Priority: env var > bundled _data/artifacts > original sibling repo (local dev)
_BUNDLED_ARTIFACTS = PROJECT_ROOT / "_data" / "artifacts"
_SIBLING_ARTIFACTS = PROJECT_ROOT.parent / "heliX" / "data-preparation" / "federated_learning" / "artifacts"
if _BUNDLED_ARTIFACTS.exists():
    _DEFAULT_ARTIFACTS = _BUNDLED_ARTIFACTS
elif _SIBLING_ARTIFACTS.exists():
    _DEFAULT_ARTIFACTS = _SIBLING_ARTIFACTS
else:
    _DEFAULT_ARTIFACTS = _BUNDLED_ARTIFACTS  # will show missing-data warnings
ARTIFACTS_ROOT = Path(os.getenv("ARTIFACTS_ROOT", _DEFAULT_ARTIFACTS))

PHENOTYPES = [
    {"id": "P1", "name": "Minimal Burden", "label": "P1 Minimal Burden", "color": "blue", "description": "Youngest cohort with minimal disease load, near-zero medication use, and rare healthcare encounters."},
    {"id": "P2", "name": "Stable Polypharmacy", "label": "P2 Stable Polypharmacy", "color": "teal", "description": "Older patients with high chronic medication exposure (~91% on long-term therapy), primarily outpatient-managed with low inpatient activity."},
    {"id": "P3", "name": "Active Multimorbid", "label": "P3 Active Multimorbid", "color": "amber", "description": "Near-average age with high diagnosis diversity and frequent outpatient visits. Moderate medication use driven by multiple concurrent conditions."},
    {"id": "P4", "name": "Cardiovascular Polypharmacy", "label": "P4 Cardiovascular Polypharmacy", "color": "orange", "description": "Oldest subgroup with dominant circulatory disease burden, highest polypharmacy (~81%), and significant inpatient activity."},
    {"id": "P5", "name": "Highest Acuity", "label": "P5 Highest Acuity", "color": "red", "description": "Highest diagnosis breadth, inpatient admission rate, and outpatient utilization across all tiers. Priority for intensive care coordination."},
]
BASE_DISTRIBUTION = {"P1": 0.28, "P2": 0.24, "P3": 0.19, "P4": 0.17, "P5": 0.12}


class ResponseStatus(BaseModel):
    state: str
    used_fallback: bool
    message: str
    missing_files: list[str] = Field(default_factory=list)


class Phenotype(BaseModel):
    id: str
    name: str
    label: str
    color: str
    description: str


class PhenotypeCount(Phenotype):
    patient_count: int
    share: float


class YearsResponse(BaseModel):
    years: list[int]
    status: ResponseStatus


class SummaryMetrics(BaseModel):
    inertia: float | None = None
    calinski_harabasz: float | None = None
    davies_bouldin: float | None = None
    approx_silhouette: float | None = None
    silhouette_is_approximate: bool = True


class SummaryResponse(BaseModel):
    year: int
    patient_count: int
    phenotype_count: int
    phenotypes: list[PhenotypeCount]
    largest_group: PhenotypeCount
    metrics: SummaryMetrics
    status: ResponseStatus


class ProfileEntry(Phenotype):
    avg_conditions: float
    avg_prescriptions: float
    avg_encounters: float
    source_cluster_id: int | None = None
    source_features: dict[str, float] = Field(default_factory=dict)


class ProfilesResponse(BaseModel):
    year: int
    profiles: list[ProfileEntry]
    status: ResponseStatus


class PhenotypesResponse(BaseModel):
    phenotypes: list[Phenotype]
    status: ResponseStatus


class TransitionEdge(BaseModel):
    from_id: str = Field(alias="from")
    to: str
    probability: float

    model_config = {"populate_by_name": True}


class TransitionsResponse(BaseModel):
    from_year: int
    to_year: int
    transitions: list[TransitionEdge]
    status: ResponseStatus


class ValidationArtifact(BaseModel):
    name: str
    type: str
    status: str
    path: str


class ValidationArtifactsResponse(BaseModel):
    data_folder: str
    artifacts: list[ValidationArtifact]
    status: ResponseStatus


class TrajectoryPoint(BaseModel):
    year: int
    phenotype_id: str
    phenotype_label: str
    age: int | None = None
    gender: str | None = None
    conditions: int | None = None
    prescriptions: int | None = None
    admissions: int | None = None
    outpatient_visits: int | None = None
    polypharmacy: bool | None = None
    chronic_rx: bool | None = None
    confidence: str | None = None


class TrajectoryResponse(BaseModel):
    patient_id: str
    trajectory: list[TrajectoryPoint]
    interpretation: str
    status: ResponseStatus


class CohortYearDistribution(BaseModel):
    year: int
    distribution: dict[str, float]


class CohortSummary(BaseModel):
    persisted: float
    progressed: float
    regressed: float


class CohortTrajectoryResponse(BaseModel):
    start_year: int
    end_year: int
    start_phenotype: str
    yearly_distribution: list[CohortYearDistribution]
    summary: CohortSummary
    status: ResponseStatus


class ForecastYearDistribution(BaseModel):
    year: int
    distribution: dict[str, float]
    is_projected: bool = True


class ForecastResponse(BaseModel):
    from_year: int
    horizon: int
    base_distribution: dict[str, float]
    projected: list[ForecastYearDistribution]
    phenotype_ids: list[str]
    status: ResponseStatus


class ComparisonMetric(BaseModel):
    metric: str
    centralized: float
    federated: float
    difference: float


class ClusterShareComparison(BaseModel):
    phenotype_id: str
    centralized_share: float
    federated_share: float
    difference: float


class ComparisonResponse(BaseModel):
    year: int
    metrics: list[ComparisonMetric]
    cluster_share_comparison: list[ClusterShareComparison]
    status: ResponseStatus


app = FastAPI(title="Spicy Care Intelligence API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _validate_year(year: int) -> int:
    return year if year in YEARS else YEARS[-1]


def _yearly_patient_count(year: int) -> int:
    return TOTAL_PATIENTS + (year - YEARS[0]) * 35_000


def _status(state: str, used_fallback: bool, message: str, missing_files: list[str] | None = None) -> ResponseStatus:
    return ResponseStatus(state=state, used_fallback=used_fallback, message=message, missing_files=missing_files or [])


def _data_dir(subpath: str) -> Path | None:
    candidate = ARTIFACTS_ROOT / subpath
    if candidate.exists() and candidate.is_dir():
        return candidate
    return None


def _load_json(path: Path) -> dict[str, Any] | list[Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def _default_phenotypes() -> list[Phenotype]:
    return [Phenotype(**item) for item in PHENOTYPES]


def _load_phenotypes() -> tuple[list[Phenotype], ResponseStatus]:
    dictionary_dir = ARTIFACTS_ROOT / "dictionaries"
    json_dictionary_path = dictionary_dir / "phenotype_dictionary.json"
    if json_dictionary_path.exists():
        payload = _load_json(json_dictionary_path)
        if isinstance(payload, dict):
            entries = payload.get("rows", [])
            latest_by_code: dict[str, dict[str, Any]] = {}
            if isinstance(entries, list):
                for raw_row in entries:
                    if not isinstance(raw_row, dict):
                        continue
                    code = str(raw_row.get("phenotype_code", "")).strip()
                    if not code:
                        continue
                    # Keep canonical non-merged states in the phenotypes endpoint.
                    if code == "P3P4_merged":
                        continue
                    current_year = int(raw_row.get("year", 0) or 0)
                    existing = latest_by_code.get(code)
                    existing_year = int(existing.get("year", 0) or 0) if existing else -1
                    if existing is None or current_year >= existing_year:
                        latest_by_code[code] = raw_row
            rows: list[Phenotype] = []
            for code in sorted(latest_by_code.keys()):
                row = latest_by_code[code]
                label = str(row.get("phenotype_label") or code).strip()
                name = label.replace(" / ", " ").strip()
                description = str(row.get("mapping_rationale") or "No description available.").strip()
                rows.append(Phenotype(id=code, name=name, label=f"{code} - {label}", color="slate", description=description))
            if rows:
                return rows, _status("ok", False, "Loaded phenotypes from artifacts/dictionaries/phenotype_dictionary.json")

    csv_dictionary_path = dictionary_dir / "phenotype_dictionary.csv"
    if csv_dictionary_path.exists():
        rows: list[Phenotype] = []
        with csv_dictionary_path.open("r", encoding="utf-8", newline="") as handle:
            reader = csv.DictReader(handle)
            for index, row in enumerate(reader):
                pid = row.get("id") or row.get("phenotype_id") or f"P{index + 1}"
                name = row.get("name") or row.get("phenotype_name") or f"Phenotype {index + 1}"
                label = row.get("label") or f"{pid} {name}"
                color = row.get("color") or "slate"
                description = row.get("description") or "No description available."
                rows.append(Phenotype(id=pid.strip(), name=name.strip(), label=label.strip(), color=color.strip(), description=description.strip()))
        if rows:
            return rows, _status("ok", False, "Loaded phenotypes from artifacts/dictionaries/phenotype_dictionary.csv")
    missing = [str(json_dictionary_path), str(csv_dictionary_path)]
    return _default_phenotypes(), _status("warning", True, "Phenotype dictionary missing; using mock phenotype metadata.", missing)


def _mock_phenotype_counts(year: int, phenotypes: list[Phenotype]) -> list[PhenotypeCount]:
    patient_count = _yearly_patient_count(year)
    drift = (year - YEARS[0]) * 0.002
    shares = {"P1": BASE_DISTRIBUTION["P1"] - drift, "P2": BASE_DISTRIBUTION["P2"] - drift / 2, "P3": BASE_DISTRIBUTION["P3"] + drift / 2, "P4": BASE_DISTRIBUTION["P4"], "P5": BASE_DISTRIBUTION["P5"] + drift}
    result: list[PhenotypeCount] = []
    for index, phenotype in enumerate(phenotypes):
        fallback_id = f"P{index + 1}"
        share = shares.get(phenotype.id, shares.get(fallback_id, 0.2))
        result.append(PhenotypeCount(**phenotype.model_dump(), patient_count=round(patient_count * share), share=round(share, 4)))
    return result


def _extract_summary_metrics(payload: dict[str, Any]) -> SummaryMetrics:
    metrics_payload = payload.get("metrics", {})
    approx_sil = metrics_payload.get("approx_silhouette")
    approx_value = None
    is_approx = True
    if isinstance(approx_sil, dict):
        approx_value = float(approx_sil.get("value", 0.0))
        is_approx = str(approx_sil.get("label", "approximate")).lower() != "exact"
    elif isinstance(approx_sil, (int, float)):
        approx_value = float(approx_sil)
    return SummaryMetrics(
        inertia=float(metrics_payload["inertia"]) if "inertia" in metrics_payload else None,
        calinski_harabasz=float(metrics_payload["calinski_harabasz"]) if "calinski_harabasz" in metrics_payload else None,
        davies_bouldin=float(metrics_payload["davies_bouldin"]) if "davies_bouldin" in metrics_payload else None,
        approx_silhouette=approx_value,
        silhouette_is_approximate=is_approx,
    )


def _load_summary_from_file(year: int, phenotypes: list[Phenotype]) -> tuple[list[PhenotypeCount], int, SummaryMetrics] | None:
    summaries_dir = _data_dir("global_summaries")
    if not summaries_dir:
        return None
    summary_path = summaries_dir / f"global_summary_{year}.json"
    if not summary_path.exists():
        return None
    payload = _load_json(summary_path)
    if not isinstance(payload, dict):
        return None
    distribution = payload.get("cluster_distribution", {})
    counts = distribution.get("counts", [])
    shares = distribution.get("proportions", [])
    total_patients = payload.get("metadata", {}).get("total_patients", _yearly_patient_count(year))

    # Build a cluster_id → count/share lookup using the phenotype dictionary rows
    # so that P5 in a k=4 year correctly uses raw_cluster_id=3, not positional index 4.
    dict_dir = ARTIFACTS_ROOT / "dictionaries"
    dict_path = dict_dir / "phenotype_dictionary.json"
    cluster_for_code: dict[str, int] = {}
    if dict_path.exists():
        dict_payload = _load_json(dict_path)
        if isinstance(dict_payload, dict):
            for row in dict_payload.get("rows", []):
                if isinstance(row, dict) and int(row.get("year", 0) or 0) == year:
                    code = str(row.get("phenotype_code", "")).strip()
                    cid = row.get("raw_cluster_id")
                    if code and cid is not None:
                        cluster_for_code[code] = int(cid)

    phenotype_counts: list[PhenotypeCount] = []
    for phenotype in phenotypes:
        if cluster_for_code and phenotype.id in cluster_for_code:
            cid = cluster_for_code[phenotype.id]
            count = int(counts[cid]) if cid < len(counts) else 0
            share = float(shares[cid]) if cid < len(shares) else (count / total_patients if total_patients else 0.0)
        else:
            # fallback: positional (used when dictionary rows are unavailable)
            index = list(p.id for p in phenotypes).index(phenotype.id)
            count = int(counts[index]) if index < len(counts) else 0
            share = float(shares[index]) if index < len(shares) else (count / total_patients if total_patients else 0.0)
        phenotype_counts.append(PhenotypeCount(**phenotype.model_dump(), patient_count=count, share=round(share, 6)))
    return phenotype_counts, int(total_patients), _extract_summary_metrics(payload)


def _mock_summary_metrics() -> SummaryMetrics:
    return SummaryMetrics()


def _load_profiles_from_file(year: int, phenotypes: list[Phenotype]) -> list[ProfileEntry] | None:
    summaries_dir = _data_dir("global_summaries")
    if not summaries_dir:
        return None
    summary_path = summaries_dir / f"global_summary_{year}.json"
    if not summary_path.exists():
        return None
    payload = _load_json(summary_path)
    if not isinstance(payload, dict):
        return None
    profile_rows = payload.get("cluster_profiles")
    if not isinstance(profile_rows, list):
        return None

    # Build raw_cluster_id → phenotype_code mapping from the dictionary
    dict_path = ARTIFACTS_ROOT / "dictionaries" / "phenotype_dictionary.json"
    code_for_cluster: dict[int, str] = {}
    if dict_path.exists():
        dict_payload = _load_json(dict_path)
        if isinstance(dict_payload, dict):
            for row in dict_payload.get("rows", []):
                if isinstance(row, dict) and int(row.get("year", 0) or 0) == year:
                    code = str(row.get("phenotype_code", "")).strip()
                    cid = row.get("raw_cluster_id")
                    if code and cid is not None:
                        code_for_cluster[int(cid)] = code

    phenotype_by_id = {p.id: p for p in phenotypes}

    profiles: list[ProfileEntry] = []
    for index, row in enumerate(profile_rows):
        if not isinstance(row, dict):
            continue
        raw_cid = int(row.get("cluster_id", index))
        code = code_for_cluster.get(raw_cid)
        phenotype = phenotype_by_id.get(code) if code else (phenotypes[index] if index < len(phenotypes) else None)
        if phenotype is None:
            continue
        means = row.get("feature_means", {})
        profiles.append(
            ProfileEntry(
                **phenotype.model_dump(),
                avg_conditions=round(float(means.get("dx_unique_count_log", 0.0)), 3),
                avg_prescriptions=round(float(means.get("prescription_count_log", 0.0)), 3),
                avg_encounters=round(float(means.get("outpatient_visits_log", 0.0)), 3),
                source_cluster_id=raw_cid,
                source_features={str(k): float(v) for k, v in means.items() if isinstance(v, (int, float))},
            )
        )
    return profiles


def _mock_profiles(year: int, phenotypes: list[Phenotype]) -> list[ProfileEntry]:
    _ = year
    profiles: list[ProfileEntry] = []
    for index, phenotype in enumerate(phenotypes):
        profiles.append(
            ProfileEntry(
                **phenotype.model_dump(),
                avg_conditions=round(1.2 + index * 1.1, 1),
                avg_prescriptions=round(2.0 + index * 2.4, 1),
                avg_encounters=round(1.5 + index * 0.8, 1),
                source_cluster_id=index,
                source_features={},
            )
        )
    return profiles


def _aggregate_transitions_from_all_harmonized_sites(from_year: int, to_year: int) -> list[TransitionEdge] | None:
    """Pool inner-join transition counts across every `transitions/harmonized/site_*`, then row-normalize."""
    if pd is None:
        return None
    harmonized_root = ARTIFACTS_ROOT / "transitions" / "harmonized"
    if not harmonized_root.is_dir():
        return None

    pair_counts: dict[tuple[str, str], int] = defaultdict(int)
    for site_dir in sorted(harmonized_root.iterdir()):
        if not site_dir.is_dir():
            continue
        src_t = site_dir / f"harmonized_{from_year}.parquet"
        src_t1 = site_dir / f"harmonized_{to_year}.parquet"
        if not src_t.exists() or not src_t1.exists():
            continue
        try:
            left = pd.read_parquet(src_t, columns=["patient_id", "phenotype_code"])
            right = pd.read_parquet(src_t1, columns=["patient_id", "phenotype_code"])
            merged = left.merge(right, on="patient_id", how="inner", suffixes=("_from", "_to"))
            if merged.empty:
                continue
            counts = merged.groupby(["phenotype_code_from", "phenotype_code_to"], dropna=False).size()
            for (fc, tc), n in counts.items():
                fc_s = str(fc).strip()
                tc_s = str(tc).strip()
                if fc_s and tc_s:
                    pair_counts[(fc_s, tc_s)] += int(n)
        except Exception:
            continue

    if not pair_counts:
        return None

    row_totals: dict[str, int] = defaultdict(int)
    for (fc, tc), n in pair_counts.items():
        row_totals[fc] += n

    transitions: list[TransitionEdge] = []
    for (fc, tc), n in sorted(pair_counts.items()):
        total = row_totals.get(fc, 0)
        prob = (float(n) / float(total)) if total else 0.0
        transitions.append(
            TransitionEdge(
                **{
                    "from": fc,
                    "to": tc,
                    "probability": round(prob, 6),
                }
            )
        )
    return transitions if transitions else None


def _mock_transitions() -> list[TransitionEdge]:
    transitions: list[TransitionEdge] = []
    for row_index, from_phenotype in enumerate(PHENOTYPES):
        for column_index, to_phenotype in enumerate(PHENOTYPES):
            stable = row_index == column_index
            transitions.append(
                TransitionEdge(
                    **{
                        "from": from_phenotype["id"],
                        "to": to_phenotype["id"],
                        "probability": 0.68 if stable else round(0.06 + column_index * 0.01, 2),
                    }
                )
            )
    return transitions


def _load_transition_file(from_year: int, to_year: int) -> list[TransitionEdge] | None:
    global_dir = _data_dir("transitions/global")
    if global_dir and pd is not None:
        row_pct_parquet_path = global_dir / f"transitions_{from_year}_{to_year}_row_percent.parquet"
        if row_pct_parquet_path.exists():
            try:
                matrix_df = pd.read_parquet(row_pct_parquet_path)
                if not matrix_df.empty:
                    from_candidates = ["from_phenotype_code", "from", "index"]
                    from_col = next((col for col in from_candidates if col in matrix_df.columns), None)
                    if from_col is None:
                        from_col = matrix_df.columns[0]
                    transitions: list[TransitionEdge] = []
                    to_cols = [col for col in matrix_df.columns if col != from_col]
                    for _, row in matrix_df.iterrows():
                        from_code = str(row.get(from_col, "")).strip()
                        if not from_code:
                            continue
                        for to_code in to_cols:
                            value = row.get(to_code, 0)
                            try:
                                probability = float(value) / 100.0
                            except (TypeError, ValueError):
                                probability = 0.0
                            transitions.append(
                                TransitionEdge(
                                    **{
                                        "from": from_code,
                                        "to": str(to_code).strip(),
                                        "probability": round(probability, 6),
                                    }
                                )
                            )
                    if transitions:
                        return transitions
            except Exception:
                pass

        long_parquet_path = global_dir / f"transitions_{from_year}_{to_year}_long.parquet"
        if long_parquet_path.exists():
            try:
                long_df = pd.read_parquet(long_parquet_path)
                transitions: list[TransitionEdge] = []
                for _, row in long_df.iterrows():
                    from_code = str(row.get("from_phenotype_code", "")).strip()
                    to_code = str(row.get("to_phenotype_code", "")).strip()
                    raw_percent = row.get("row_percent", 0)
                    if not from_code or not to_code:
                        continue
                    try:
                        probability = float(raw_percent) / 100.0
                    except (TypeError, ValueError):
                        probability = 0.0
                    transitions.append(
                        TransitionEdge(
                            **{
                                "from": from_code,
                                "to": to_code,
                                "probability": round(probability, 6),
                            }
                        )
                    )
                if transitions:
                    return transitions
            except Exception:
                pass

    if global_dir:
        row_pct_path = global_dir / f"transitions_{from_year}_{to_year}_row_percent.csv"
        if row_pct_path.exists():
            with row_pct_path.open("r", encoding="utf-8", newline="") as handle:
                reader = csv.DictReader(handle)
                if not reader.fieldnames:
                    return None
                from_key = reader.fieldnames[0]
                to_keys = [name for name in reader.fieldnames[1:] if name]
                transitions: list[TransitionEdge] = []
                for row in reader:
                    from_code = str(row.get(from_key, "")).strip()
                    if not from_code:
                        continue
                    for to_code in to_keys:
                        raw_percent = str(row.get(to_code, "0")).strip()
                        try:
                            probability = float(raw_percent) / 100.0
                        except ValueError:
                            probability = 0.0
                        transitions.append(
                            TransitionEdge(
                                **{
                                    "from": from_code,
                                    "to": to_code,
                                    "probability": round(probability, 6),
                                }
                            )
                        )
                if transitions:
                    return transitions

        long_path = global_dir / f"transitions_{from_year}_{to_year}_long.csv"
        if long_path.exists():
            with long_path.open("r", encoding="utf-8", newline="") as handle:
                reader = csv.DictReader(handle)
                transitions: list[TransitionEdge] = []
                for row in reader:
                    from_code = str(row.get("from_phenotype_code", "")).strip()
                    to_code = str(row.get("to_phenotype_code", "")).strip()
                    raw_percent = str(row.get("row_percent", "0")).strip()
                    if not from_code or not to_code:
                        continue
                    try:
                        probability = float(raw_percent) / 100.0
                    except ValueError:
                        probability = 0.0
                    transitions.append(
                        TransitionEdge(
                            **{
                                "from": from_code,
                                "to": to_code,
                                "probability": round(probability, 6),
                            }
                        )
                    )
                if transitions:
                    return transitions

    multisite = _aggregate_transitions_from_all_harmonized_sites(from_year, to_year)
    if multisite:
        return multisite
    return None


def _metrics_payload_for_year(year: int) -> dict[str, Any] | None:
    metrics_dir = _data_dir("yearly_metrics")
    if not metrics_dir:
        return None
    target_path = metrics_dir / f"metrics_{year}.json"
    if not target_path.exists():
        return None
    payload = _load_json(target_path)
    if isinstance(payload, dict):
        return payload
    return None


def _mock_trajectory(patient_id: str) -> tuple[list[TrajectoryPoint], str]:
    labels = {item["id"]: item["label"] for item in PHENOTYPES}
    path = ["P1", "P1", "P2", "P2", "P3", "P4", "P5", "P5"]
    points: list[TrajectoryPoint] = []
    for offset, year in enumerate(YEARS):
        pid = path[offset % len(path)]
        points.append(TrajectoryPoint(year=year, phenotype_id=pid, phenotype_label=labels[pid]))
    interpretation = (
        f"Patient {patient_id} shows an overall progression from lower burden to higher complexity over time."
    )
    return points, interpretation


def _mock_cohort_distribution(start_year: int, end_year: int, start_phenotype: str) -> list[CohortYearDistribution]:
    start_idx = max(min(int(start_phenotype.replace("P", "")) - 1, 4), 0)
    yearly: list[CohortYearDistribution] = []
    for year in range(start_year, end_year + 1):
        shift = year - start_year
        distribution = {f"P{i + 1}": 0.0 for i in range(5)}
        stay = max(0.45, 0.8 - shift * 0.08)
        distribution[f"P{start_idx + 1}"] = stay
        if start_idx < 4:
            distribution[f"P{start_idx + 2}"] = min(0.4, 0.15 + shift * 0.06)
        if start_idx > 0:
            distribution[f"P{start_idx}"] = min(0.25, 0.05 + shift * 0.03)
        remainder = 1.0 - sum(distribution.values())
        distribution["P5"] += max(0.0, remainder)
        yearly.append(
            CohortYearDistribution(
                year=year,
                distribution={k: round(v * 100, 2) for k, v in distribution.items()},
            )
        )
    return yearly


def _mock_comparison(year: int, summary: SummaryResponse) -> ComparisonResponse:
    scale = (year - YEARS[0]) * 0.005
    metrics = [
        ComparisonMetric(metric="inertia", centralized=1.18e7 + year * 13.0, federated=1.21e7 + year * 11.0, difference=round((1.21e7 + year * 11.0) - (1.18e7 + year * 13.0), 3)),
        ComparisonMetric(metric="calinski_harabasz", centralized=1760 - scale * 100, federated=1710 - scale * 100, difference=round(-50.0, 3)),
        ComparisonMetric(metric="davies_bouldin", centralized=0.79 + scale, federated=0.83 + scale, difference=round(0.04, 3)),
        ComparisonMetric(metric="approx_silhouette", centralized=0.34 - scale, federated=0.31 - scale, difference=round(-0.03, 3)),
    ]
    shares: list[ClusterShareComparison] = []
    for item in summary.phenotypes:
        centralized_share = round(item.share * 100, 2)
        federated_share = round(max(0.1, centralized_share + (0.8 if item.id in {"P1", "P4"} else -0.6)), 2)
        shares.append(
            ClusterShareComparison(
                phenotype_id=item.id,
                centralized_share=centralized_share,
                federated_share=federated_share,
                difference=round(federated_share - centralized_share, 2),
            )
        )
    return ComparisonResponse(
        year=year,
        metrics=metrics,
        cluster_share_comparison=shares,
        status=_status("warning", True, "Comparison files missing; using mock centralized-vs-federated values.", []),
    )


@app.get("/api/years", response_model=YearsResponse)
def get_years() -> YearsResponse:
    summaries_dir = _data_dir("global_summaries")
    years_from_files: set[int] = set()
    if summaries_dir:
        for path in summaries_dir.glob("global_summary_*.json"):
            year_token = path.stem.replace("global_summary_", "")
            if year_token.isdigit():
                years_from_files.add(int(year_token))
    if years_from_files:
        return YearsResponse(years=sorted(years_from_files), status=_status("ok", False, "Loaded years from global summary files."))
    return YearsResponse(years=YEARS, status=_status("warning", True, "No artifact yearly files found; using mock year range.", [str(ARTIFACTS_ROOT / "global_summaries")]))


@app.get("/api/summary/{year}", response_model=SummaryResponse)
def get_summary(year: int) -> SummaryResponse:
    selected_year = _validate_year(year)
    phenotypes, phenotype_status = _load_phenotypes()
    summary_payload = _load_summary_from_file(selected_year, phenotypes)
    if summary_payload:
        phenotype_counts, patient_count, metrics = summary_payload
        return SummaryResponse(
            year=selected_year,
            patient_count=patient_count,
            phenotype_count=len(phenotype_counts),
            phenotypes=phenotype_counts,
            largest_group=max(phenotype_counts, key=lambda item: item.patient_count),
            metrics=metrics,
            status=_status("ok", phenotype_status.used_fallback, "Loaded summary from data files.", phenotype_status.missing_files),
        )
    phenotype_counts = _mock_phenotype_counts(selected_year, phenotypes)
    missing_summary = str((ARTIFACTS_ROOT / "global_summaries" / f"global_summary_{selected_year}.json"))
    return SummaryResponse(
        year=selected_year,
        patient_count=_yearly_patient_count(selected_year),
        phenotype_count=len(phenotype_counts),
        phenotypes=phenotype_counts,
        largest_group=max(phenotype_counts, key=lambda item: item.patient_count),
        metrics=_mock_summary_metrics(),
        status=_status("warning", True, "Summary file missing; using mock summary data.", phenotype_status.missing_files + [missing_summary]),
    )


@app.get("/api/profiles/{year}", response_model=ProfilesResponse)
def get_profiles(year: int) -> ProfilesResponse:
    selected_year = _validate_year(year)
    phenotypes, phenotype_status = _load_phenotypes()
    profiles = _load_profiles_from_file(selected_year, phenotypes)
    if profiles:
        return ProfilesResponse(
            year=selected_year,
            profiles=profiles,
            status=_status("ok", phenotype_status.used_fallback, "Loaded profile features from global summary file.", phenotype_status.missing_files),
        )
    missing_profile_path = str((ARTIFACTS_ROOT / "global_summaries" / f"global_summary_{selected_year}.json"))
    return ProfilesResponse(
        year=selected_year,
        profiles=_mock_profiles(selected_year, phenotypes),
        status=_status("warning", True, "Cluster profile file missing; using mock profile data.", phenotype_status.missing_files + [missing_profile_path]),
    )


@app.get("/api/phenotypes", response_model=PhenotypesResponse)
def get_phenotypes() -> PhenotypesResponse:
    phenotypes, phenotype_status = _load_phenotypes()
    return PhenotypesResponse(phenotypes=phenotypes, status=phenotype_status)


@app.get("/api/transitions/{from_year}/{to_year}", response_model=TransitionsResponse)
def get_transitions(from_year: int, to_year: int) -> TransitionsResponse:
    start_year = _validate_year(from_year)
    end_year = _validate_year(to_year)
    transitions = _load_transition_file(start_year, end_year)
    if transitions:
        return TransitionsResponse(
            from_year=start_year,
            to_year=end_year,
            transitions=transitions,
            status=_status("ok", False, "Loaded transitions from artifacts transition files."),
        )
    missing = [
        str(ARTIFACTS_ROOT / "transitions" / "global" / f"transitions_{start_year}_{end_year}_row_percent.parquet"),
        str(ARTIFACTS_ROOT / "transitions" / "global" / f"transitions_{start_year}_{end_year}_long.parquet"),
        str(ARTIFACTS_ROOT / "transitions" / "global" / f"transitions_{start_year}_{end_year}_row_percent.csv"),
        str(ARTIFACTS_ROOT / "transitions" / "global" / f"transitions_{start_year}_{end_year}_long.csv"),
        str(ARTIFACTS_ROOT / "transitions" / "harmonized" / "site_1" / f"harmonized_{start_year}.parquet"),
        str(ARTIFACTS_ROOT / "transitions" / "harmonized" / "site_1" / f"harmonized_{end_year}.parquet"),
    ]
    return TransitionsResponse(
        from_year=start_year,
        to_year=end_year,
        transitions=_mock_transitions(),
        status=_status("warning", True, "Transition files missing; using mock transition matrix.", missing),
    )


@app.get("/api/validation/artifacts", response_model=ValidationArtifactsResponse)
def get_validation_artifacts() -> ValidationArtifactsResponse:
    """
    Top-level folder presence check only. Each row is a directory the pipeline is
    expected to populate; status reflects whether the folder exists and is
    non-empty.
    """
    folders: list[tuple[str, str, Path]] = [
        ("global_summaries", "summary", ARTIFACTS_ROOT / "global_summaries"),
        ("yearly_metrics", "metric", ARTIFACTS_ROOT / "yearly_metrics"),
        ("dictionaries", "definition", ARTIFACTS_ROOT / "dictionaries"),
        ("transitions/global", "transition-folder", ARTIFACTS_ROOT / "transitions" / "global"),
        ("transitions/harmonized", "transition-folder", ARTIFACTS_ROOT / "transitions" / "harmonized"),
    ]

    artifacts: list[ValidationArtifact] = []
    missing_files: list[str] = []
    for name, artifact_type, path in folders:
        is_dir = path.exists() and path.is_dir()
        is_populated = is_dir and any(path.iterdir())
        if not is_populated:
            missing_files.append(str(path))
        artifacts.append(
            ValidationArtifact(
                name=name,
                type=artifact_type,
                status="available" if is_populated else "missing",
                path=str(path),
            )
        )

    state = "ok" if not missing_files else "warning"
    return ValidationArtifactsResponse(
        data_folder=str(ARTIFACTS_ROOT),
        artifacts=artifacts,
        status=_status(state, False, "Validation artifact scan completed.", missing_files),
    )


@app.get("/api/patients", response_model=dict)
def list_patients(tier: str | None = None) -> dict:
    """Return the patient index from harmonized_assignments/index.json."""
    index_path = ARTIFACTS_ROOT / "harmonized_assignments" / "index.json"
    if not index_path.exists():
        return {"patients": [], "status": _status("warning", True, "Patient index not found.", [str(index_path)]).model_dump()}
    try:
        data = _load_json(index_path)
        patients = data.get("patients", [])
        if tier and tier in {"P1", "P2", "P3", "P4", "P5"}:
            patients = [p for p in patients if p.get("dominant_tier") == tier]
        return {"patients": patients, "status": _status("ok", False, f"{len(patients)} patients available.").model_dump()}
    except Exception as exc:
        return {"patients": [], "status": _status("error", True, str(exc)).model_dump()}


@app.get("/api/trajectory/{patient_id}", response_model=TrajectoryResponse)
def get_trajectory(patient_id: str) -> TrajectoryResponse:
    assignments_dir = ARTIFACTS_ROOT / "harmonized_assignments"
    patient_path = assignments_dir / f"{patient_id}.json"
    if patient_path.exists():
        try:
            data = _load_json(patient_path)
            points = [
                TrajectoryPoint(
                    year=int(pt["year"]),
                    phenotype_id=str(pt["phenotype_id"]),
                    phenotype_label=str(pt["phenotype_label"]),
                    age=pt.get("age"),
                    gender=pt.get("gender"),
                    conditions=pt.get("conditions"),
                    prescriptions=pt.get("prescriptions"),
                    admissions=pt.get("admissions"),
                    outpatient_visits=pt.get("outpatient_visits"),
                    polypharmacy=pt.get("polypharmacy"),
                    chronic_rx=pt.get("chronic_rx"),
                    confidence=pt.get("confidence"),
                )
                for pt in data.get("trajectory", [])
            ]
            return TrajectoryResponse(
                patient_id=patient_id,
                trajectory=points,
                interpretation=str(data.get("interpretation", "")),
                status=_status("ok", False, "Loaded from harmonized assignment records."),
            )
        except Exception:
            pass

    trajectory_points, interpretation = _mock_trajectory(patient_id)
    missing = [str(assignments_dir)]
    return TrajectoryResponse(
        patient_id=patient_id,
        trajectory=trajectory_points,
        interpretation=interpretation,
        status=_status("warning", True, "Patient-level trajectory files not found; using mock trajectory.", missing),
    )


def _load_cohort_trajectory(
    start_year: int, end_year: int, start_phenotype: str
) -> tuple[list[CohortYearDistribution], CohortSummary] | None:
    """Load pre-computed cohort trajectory from generated artifact JSON files."""
    cohorts_dir = ARTIFACTS_ROOT / "cohorts"
    # Try exact phenotype first, then canonical fallback (P3P4_merged → P4)
    candidates = [start_phenotype]
    if start_phenotype == "P4":
        candidates.append("P3P4_merged")
    for phenotype_key in candidates:
        path = cohorts_dir / f"cohort_{start_year}_{phenotype_key}.json"
        if not path.exists():
            continue
        try:
            data = _load_json(path)
            if not isinstance(data, dict):
                continue
            raw_yearly = data.get("yearly_distribution", [])
            yearly: list[CohortYearDistribution] = []
            for entry in raw_yearly:
                year = int(entry.get("year", 0))
                if year < start_year or year > end_year:
                    continue
                dist = {k: round(float(v), 2) for k, v in entry.get("distribution", {}).items()}
                yearly.append(CohortYearDistribution(year=year, distribution=dist))
            if not yearly:
                continue
            raw_summary = data.get("summary", {})
            summary = CohortSummary(
                persisted=float(raw_summary.get("persisted", 0.0)),
                progressed=float(raw_summary.get("progressed", 0.0)),
                regressed=float(raw_summary.get("improved", raw_summary.get("regressed", 0.0))),
            )
            return yearly, summary
        except Exception:
            continue
    return None


@app.get("/api/cohort/trajectory", response_model=CohortTrajectoryResponse)
def get_cohort_trajectory(
    start_year: int = 2012,
    end_year: int = 2016,
    start_phenotype: str = "P2",
) -> CohortTrajectoryResponse:
    bounded_start = _validate_year(start_year)
    bounded_end = _validate_year(end_year)
    if bounded_end < bounded_start:
        bounded_end = bounded_start
    start_phenotype = start_phenotype if start_phenotype in {"P1", "P2", "P3", "P4", "P5"} else "P2"

    loaded = _load_cohort_trajectory(bounded_start, bounded_end, start_phenotype)
    if loaded:
        yearly_distribution, summary = loaded
        return CohortTrajectoryResponse(
            start_year=bounded_start,
            end_year=bounded_end,
            start_phenotype=start_phenotype,
            yearly_distribution=yearly_distribution,
            summary=summary,
            status=_status("ok", False, "Loaded cohort trajectory from generated artifacts."),
        )

    yearly_distribution = _mock_cohort_distribution(bounded_start, bounded_end, start_phenotype)
    summary = CohortSummary(persisted=62.0, progressed=27.0, regressed=11.0)
    missing = [str(ARTIFACTS_ROOT / "cohorts")]
    return CohortTrajectoryResponse(
        start_year=bounded_start,
        end_year=bounded_end,
        start_phenotype=start_phenotype,
        yearly_distribution=yearly_distribution,
        summary=summary,
        status=_status("warning", True, "Cohort trajectory artifacts missing; using mock cohort simulation.", missing),
    )


def _build_markov_matrix(transitions: list[TransitionEdge], phenotype_ids: list[str]) -> list[list[float]]:
    """Build a row-stochastic transition matrix from API transition edges."""
    n = len(phenotype_ids)
    idx = {pid: i for i, pid in enumerate(phenotype_ids)}
    matrix = [[0.0] * n for _ in range(n)]
    for edge in transitions:
        f = str(getattr(edge, "from_id", None) or "")
        t = str(edge.to or "")
        if f in idx and t in idx:
            matrix[idx[f]][idx[t]] += edge.probability
    # Normalize each row so it sums to 1 (handles merged/missing IDs gracefully)
    for i in range(n):
        row_sum = sum(matrix[i])
        if row_sum > 0:
            matrix[i] = [v / row_sum for v in matrix[i]]
        else:
            matrix[i][i] = 1.0  # absorbing state fallback
    return matrix


def _multiply_distribution(dist: list[float], matrix: list[list[float]]) -> list[float]:
    """Apply one Markov step: dist_new[j] = sum_i dist[i] * matrix[i][j]."""
    n = len(dist)
    result = [0.0] * n
    for i in range(n):
        for j in range(n):
            result[j] += dist[i] * matrix[i][j]
    return result


@app.get("/api/forecast/{from_year}", response_model=ForecastResponse)
def get_forecast(from_year: int, horizon: int = 3) -> ForecastResponse:
    """
    Project population distribution forward using the Markov transition matrix.
    Loads the latest available transition data anchored at from_year → from_year+1.
    Falls back to mock transitions when real data is unavailable.
    """
    bounded_from = _validate_year(from_year)
    horizon = max(1, min(horizon, 5))
    phenotype_ids = ["P1", "P2", "P3", "P4", "P5"]

    # Load base distribution for from_year
    phenotypes, _ = _load_phenotypes()
    summary_payload = _load_summary_from_file(bounded_from, phenotypes)
    if summary_payload:
        phenotype_counts, patient_count, _ = summary_payload
        base_dist_map = {pc.id: float(pc.share) for pc in phenotype_counts}
    else:
        mock_counts = _mock_phenotype_counts(bounded_from, phenotypes)
        base_dist_map = {pc.id: float(pc.share) for pc in mock_counts}

    base_dist = [base_dist_map.get(pid, 0.0) for pid in phenotype_ids]
    # Normalize
    total = sum(base_dist)
    if total > 0:
        base_dist = [v / total for v in base_dist]

    # Load transition matrix anchored at from_year → from_year+1
    to_year = bounded_from + 1 if (bounded_from + 1) in YEARS else bounded_from
    transitions = _load_transition_file(bounded_from, to_year) or _mock_transitions()
    matrix = _build_markov_matrix(transitions, phenotype_ids)

    # Project forward
    current = list(base_dist)
    projected: list[ForecastYearDistribution] = []
    for step in range(1, horizon + 1):
        current = _multiply_distribution(current, matrix)
        projected.append(
            ForecastYearDistribution(
                year=bounded_from + step,
                distribution={pid: round(current[i] * 100, 2) for i, pid in enumerate(phenotype_ids)},
                is_projected=True,
            )
        )

    return ForecastResponse(
        from_year=bounded_from,
        horizon=horizon,
        base_distribution={pid: round(base_dist_map.get(pid, 0.0) * 100, 2) for pid in phenotype_ids},
        projected=projected,
        phenotype_ids=phenotype_ids,
        status=_status(
            "ok" if transitions != _mock_transitions() else "warning",
            transitions == _mock_transitions(),
            "Population forecast computed via Markov chain projection." if transitions != _mock_transitions()
            else "Forecast computed with mock transition matrix — real transitions not yet available.",
        ),
    )


@app.get("/api/comparison/{year}", response_model=ComparisonResponse)
def get_comparison(year: int) -> ComparisonResponse:
    selected_year = _validate_year(year)
    summary = get_summary(selected_year)
    metrics_payload = _metrics_payload_for_year(selected_year)
    if metrics_payload:
        metrics = [
            ComparisonMetric(
                metric="inertia",
                centralized=float(metrics_payload.get("inertia", 0.0)),
                federated=float(metrics_payload.get("inertia", 0.0)),
                difference=0.0,
            ),
            ComparisonMetric(
                metric="calinski_harabasz",
                centralized=float(metrics_payload.get("calinski_harabasz", 0.0)),
                federated=float(metrics_payload.get("calinski_harabasz", 0.0)),
                difference=0.0,
            ),
            ComparisonMetric(
                metric="davies_bouldin",
                centralized=float(metrics_payload.get("davies_bouldin", 0.0)),
                federated=float(metrics_payload.get("davies_bouldin", 0.0)),
                difference=0.0,
            ),
            ComparisonMetric(
                metric="approx_silhouette",
                centralized=float(metrics_payload.get("approx_silhouette", 0.0)),
                federated=float(metrics_payload.get("approx_silhouette", 0.0)),
                difference=0.0,
            ),
        ]
        share_comp = [
            ClusterShareComparison(
                phenotype_id=item.id,
                centralized_share=round(item.share * 100, 2),
                federated_share=round(item.share * 100, 2),
                difference=0.0,
            )
            for item in summary.phenotypes
        ]
        return ComparisonResponse(
            year=selected_year,
            metrics=metrics,
            cluster_share_comparison=share_comp,
            status=_status("ok", False, "Loaded comparison baseline from yearly metric artifact."),
        )
    return _mock_comparison(selected_year, summary)


# ── Drug Adherence (C09) endpoints ───────────────────────────────────────────

_BUNDLED_ADHERENCE = PROJECT_ROOT / "_data" / "adherence"
_SIBLING_ADHERENCE = PROJECT_ROOT.parent.parent / "drug-adherence-fl" / "data" / "app"
_DEFAULT_ADHERENCE = _BUNDLED_ADHERENCE if _BUNDLED_ADHERENCE.exists() else _SIBLING_ADHERENCE
ADHERENCE_DATA_DIR = Path(os.getenv("ADHERENCE_DATA_DIR", _DEFAULT_ADHERENCE))


def _adherence_file(name: str) -> Path:
    return ADHERENCE_DATA_DIR / name


@app.get("/api/adherence/summary")
def adherence_summary() -> Any:
    path = _adherence_file("c09_app_summary.json")
    if not path.exists():
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail=f"File not found: {path}")
    return json.loads(path.read_text(encoding="utf-8"))


@app.get("/api/adherence/risk-groups")
def adherence_risk_groups() -> Any:
    path = _adherence_file("c09_risk_group_summary.csv")
    if not path.exists():
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail=f"File not found: {path}")
    rows: list[dict] = []
    with path.open(encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            parsed: dict[str, Any] = {}
            for k, v in row.items():
                try:
                    parsed[k] = int(v) if "." not in v else float(v)
                except (ValueError, TypeError):
                    parsed[k] = v
            rows.append(parsed)
    return rows


@app.get("/api/adherence/model-comparison")
def adherence_model_comparison() -> Any:
    path = _adherence_file("c09_model_comparison_summary.csv")
    if not path.exists():
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail=f"File not found: {path}")
    rows: list[dict] = []
    with path.open(encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            parsed: dict[str, Any] = {}
            for k, v in row.items():
                try:
                    parsed[k] = int(v) if "." not in v else float(v)
                except (ValueError, TypeError):
                    parsed[k] = v
            rows.append(parsed)
    return rows


@app.get("/api/adherence/predictions")
def adherence_predictions() -> Any:
    path = _adherence_file("c09_test_predictions_demo_sample.csv")
    if not path.exists():
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail=f"File not found: {path}")
    rows: list[dict] = []
    with path.open(encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            parsed: dict[str, Any] = {}
            for k, v in row.items():
                if v == "" or v is None:
                    parsed[k] = None
                else:
                    try:
                        parsed[k] = int(v) if "." not in v else float(v)
                    except (ValueError, TypeError):
                        parsed[k] = v
            rows.append(parsed)
    return rows


# ── Serve built frontend (production) ────────────────────────────────────────
_DIST = Path(__file__).resolve().parent.parent / "frontend" / "dist"

if _DIST.exists():
    from fastapi.staticfiles import StaticFiles
    from fastapi.responses import FileResponse

    app.mount("/assets", StaticFiles(directory=_DIST / "assets"), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    def spa_fallback(full_path: str):
        from fastapi import HTTPException
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="API endpoint not found")
        return FileResponse(_DIST / "index.html")
