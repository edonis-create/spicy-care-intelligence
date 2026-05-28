const API_BASE_URL = import.meta.env.VITE_API_URL || "";

function buildApiUrl(path) {
  return `${API_BASE_URL}${path}`;
}

class ApiError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
  }
}

async function request(path, options = {}) {
  const response = await fetch(buildApiUrl(path), options);

  if (!response.ok) {
    const message = `Request failed for ${path} (${response.status}).`;
    throw new ApiError(message, response.status);
  }

  const payload = await response.json();
  return payload;
}

export async function getYears() {
  return request("/api/years");
}

export async function getSummary(year) {
  return request(`/api/summary/${year}`);
}

export async function getProfiles(year) {
  return request(`/api/profiles/${year}`);
}

export async function getPhenotypes() {
  return request("/api/phenotypes");
}

export async function getTransitions(fromYear, toYear) {
  return request(`/api/transitions/${fromYear}/${toYear}`);
}

export async function getValidationArtifacts() {
  return request("/api/validation/artifacts");
}

export async function getPatients(tier) {
  const suffix = tier ? `?tier=${encodeURIComponent(tier)}` : "";
  return request(`/api/patients${suffix}`);
}

export async function getTrajectory(patientId) {
  return request(`/api/trajectory/${encodeURIComponent(patientId)}`);
}

export async function getCohortTrajectory(params = {}) {
  const pairs = [];
  if (params.startYear) pairs.push(`start_year=${encodeURIComponent(String(params.startYear))}`);
  if (params.endYear) pairs.push(`end_year=${encodeURIComponent(String(params.endYear))}`);
  if (params.startPhenotype) pairs.push(`start_phenotype=${encodeURIComponent(params.startPhenotype)}`);
  const queryString = pairs.join("&");
  const suffix = queryString ? `?${queryString}` : "";
  return request(`/api/cohort/trajectory${suffix}`);
}

export async function getComparison(year) {
  return request(`/api/comparison/${year}`);
}

export async function getForecast(fromYear, horizon = 3) {
  return request(`/api/forecast/${fromYear}?horizon=${horizon}`);
}

export function getStatusWarning(payload) {
  if (!payload?.status || payload.status.state === "ok") {
    return "";
  }
  return payload.status.message || "Backend returned a warning status.";
}

export function getApiErrorMessage(error, fallbackMessage) {
  if (error instanceof ApiError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallbackMessage;
}
