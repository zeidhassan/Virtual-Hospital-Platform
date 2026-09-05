import apiClient from '@/api/client';

// Opens a file served by an authenticated /api/files/* route in a new tab.
// A plain <a href> can't carry the Authorization header these routes
// require, so this fetches the file as a blob and opens an object URL
// instead.
export async function openAuthedFile(apiPath) {
  const response = await apiClient.get(apiPath, { responseType: 'blob' });
  const url = URL.createObjectURL(response.data);
  window.open(url, '_blank', 'noopener,noreferrer');
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

// Extracts just the filename from a stored path like
// "uploads/medical-records/172-report.pdf".
export function fileNameFromPath(storedPath) {
  return storedPath ? storedPath.split('/').pop() : '';
}
