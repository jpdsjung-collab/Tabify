/**
 * API client — communicates with the Tabify backend.
 */

const API_BASE = '';

/**
 * Fetch system status (Audiveris availability, etc.)
 * @returns {Promise<object>}
 */
export async function fetchStatus() {
  const res = await fetch(`${API_BASE}/api/status`);
  if (!res.ok) throw new Error('Failed to fetch server status');
  return res.json();
}

/**
 * Upload a sheet music file and convert to guitar TAB.
 * Reports upload progress via onProgress callback.
 *
 * @param {File} file
 * @param {{ onProgress?: (percent: number, stage: string) => void }} options
 * @returns {Promise<object>} Conversion result data
 */
export function convertFile(file, { onProgress } = {}) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append('sheet', file);

    xhr.open('POST', `${API_BASE}/api/convert`);

    // Upload progress tracking
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && onProgress) {
        const percent = Math.round((event.loaded / event.total) * 80);
        onProgress(percent, 'Uploading…');
      }
    });

    xhr.upload.addEventListener('load', () => {
      if (onProgress) onProgress(85, 'Processing sheet music…');
    });

    xhr.addEventListener('load', () => {
      if (onProgress) onProgress(100, 'Complete');

      try {
        const response = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300 && response.success) {
          resolve(response.data);
        } else {
          reject(new Error(response.message || `Server error (${xhr.status})`));
        }
      } catch {
        reject(new Error('Invalid server response'));
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Network error — is the Tabify server running?'));
    });

    xhr.addEventListener('timeout', () => {
      reject(new Error('Request timed out. Large files may take longer with Audiveris OMR.'));
    });

    xhr.timeout = 180000; // 3 minutes for OMR processing
    xhr.send(formData);
  });
}

/**
 * Trigger a file download from an export endpoint.
 * @param {string} jobId
 * @param {'pdf' | 'png'} format
 * @param {string} filename
 */
export async function downloadExport(jobId, format, filename) {
  const res = await fetch(`${API_BASE}/api/export/${jobId}/${format}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Export failed (${res.status})`);
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
