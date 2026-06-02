import axios from "axios";

/** All server CSV export calls should use this Accept header (avoids DRF 406). */
export const CSV_ACCEPT_HEADER = "text/csv, application/octet-stream, */*";

export function escapeCsvField(value) {
  const s = String(value ?? "");
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function buildClientCsvContent(headers, rows) {
  const lines = [
    headers.map(escapeCsvField).join(","),
    ...rows.map((row) => row.map(escapeCsvField).join(",")),
  ];
  return lines.join("\n");
}

function csvDownloadHeaders() {
  const headers = { Accept: CSV_ACCEPT_HEADER };
  const accessToken = localStorage.getItem("accessToken");
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }
  const adminCompanyId = localStorage.getItem("adminCompanyId");
  if (adminCompanyId) {
    headers["X-Company-Id"] = adminCompanyId;
  }
  return headers;
}

function parseFilename(contentDisposition, fallback) {
  const match = (contentDisposition || "").match(/filename="?([^"]+)"?/);
  return match ? match[1] : fallback;
}

async function blobErrorMessage(blob) {
  try {
    const text = await blob.text();
    const data = JSON.parse(text);
    return data?.error || data?.detail || text || "Export failed";
  } catch {
    return "Export failed";
  }
}

function triggerBrowserDownload(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

/**
 * Download a CSV from a GET API path (e.g. /history/components/1/export/).
 */
export async function downloadCsvFromApi(apiPath, { fallbackFilename = "export.csv" } = {}) {
  const base = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000/api";
  const path = apiPath.startsWith("/") ? apiPath : `/${apiPath}`;
  const response = await axios.get(`${base}${path}`, {
    headers: csvDownloadHeaders(),
    responseType: "blob",
    withCredentials: true,
    validateStatus: (status) => status < 500,
  });

  if (response.status >= 400) {
    throw new Error(await blobErrorMessage(response.data));
  }

  const contentType = String(response.headers["content-type"] || "");
  if (contentType.includes("application/json")) {
    throw new Error(await blobErrorMessage(response.data));
  }

  const filename = parseFilename(response.headers["content-disposition"], fallbackFilename);
  const blob = new Blob([response.data], { type: "text/csv;charset=utf-8" });
  triggerBrowserDownload(blob, filename);
}

/**
 * Build and download a CSV entirely in the browser (Work Orders, etc.).
 */
export function downloadClientCsv(filename, headers, rows) {
  if (!rows?.length) {
    throw new Error("No rows to export.");
  }
  const csv = `\ufeff${buildClientCsvContent(headers, rows)}`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  triggerBrowserDownload(blob, filename);
}
