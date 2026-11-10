const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api').replace(/\/+$/, '');

export async function api(path, options = {}) {
  const token = localStorage.getItem('electro-token');
  const headers = { Accept: 'application/json', ...options.headers };
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body)
    });
  } catch {
    throw new Error(`Không kết nối được API tại ${API_URL}. Hãy kiểm tra server backend.`);
  }

  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.message || `Yêu cầu thất bại (${response.status})`);
  return result;
}

export function money(value = 0) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
}

export function imageOf(product) {
  return product?.images?.find(Boolean) || '';
}
