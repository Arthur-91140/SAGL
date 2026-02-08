const API_BASE = '/api';

function getToken(): string | null {
  return localStorage.getItem('sagl_token');
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    localStorage.removeItem('sagl_token');
    if (window.location.pathname.startsWith('/admin')) {
      window.location.href = '/admin/login';
    }
    throw new Error('Non autorisé');
  }

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || `Erreur ${response.status}`);
  }

  // Gérer les réponses non-JSON (PDF, images)
  const contentType = response.headers.get('content-type');
  if (contentType && !contentType.includes('application/json')) {
    return response.blob() as any;
  }

  return response.json();
}

// Auth
export const auth = {
  login: (username: string, password: string) =>
    request<{ token: string; username: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
  me: () => request<{ id: number; username: string }>('/auth/me'),
  changePassword: (currentPassword: string, newPassword: string) =>
    request<{ message: string }>('/auth/change-password', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword }),
    }),
};

// Matériels
export const materials = {
  list: () => request<any[]>('/admin/materials'),
  create: (data: { name: string; description?: string; alertThreshold?: number }) =>
    request<any>('/admin/materials', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: number, data: { name: string; description?: string; alertThreshold?: number | null }) =>
    request<any>(`/admin/materials/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (id: number) =>
    request<any>(`/admin/materials/${id}`, { method: 'DELETE' }),
};

// Stockages
export const storages = {
  tree: () => request<any[]>('/admin/storages/tree'),
  list: () => request<any[]>('/admin/storages'),
  get: (id: number) => request<any>(`/admin/storages/${id}`),
  create: (data: { name: string; parentId?: number }) =>
    request<any>('/admin/storages', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: number, data: { name: string; parentId?: number | null }) =>
    request<any>(`/admin/storages/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (id: number) =>
    request<any>(`/admin/storages/${id}`, { method: 'DELETE' }),
  generateLink: (id: number) =>
    request<{ uniqueLink: string; url: string }>(`/admin/storages/${id}/generate-link`, {
      method: 'POST',
    }),
  getQRCode: (id: number) =>
    request<Blob>(`/admin/storages/${id}/qrcode`),
  updateTemplate: (id: number, items: { materialId: number; expectedQuantity: number }[]) =>
    request<any>(`/admin/storages/${id}/template`, {
      method: 'PUT',
      body: JSON.stringify({ items }),
    }),
  updateStock: (id: number, items: { materialId: number; quantity: number; expirationDate?: string }[]) =>
    request<any>(`/admin/storages/${id}/stock`, {
      method: 'PUT',
      body: JSON.stringify({ items }),
    }),
  addStock: (id: number, data: { materialId: number; quantity: number; expirationDate?: string }) =>
    request<any>(`/admin/storages/${id}/stock/add`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// Inventaires (admin)
export const inventories = {
  list: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<{ inventories: any[]; pagination: any }>(`/admin/inventories${query}`);
  },
  get: (id: number) => request<any>(`/admin/inventories/${id}`),
};

// Notifications
export const notifications = {
  get: () => request<{ notifications: any[]; count: number }>('/admin/notifications'),
};

// Statistiques
export const stats = {
  get: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<any>(`/admin/stats${query}`);
  },
};

// Exports
export const exports_ = {
  csv: (storageId?: number) => {
    const query = storageId ? `?storageId=${storageId}` : '';
    return request<Blob>(`/admin/exports/csv${query}`);
  },
  pdf: (storageId?: number) => {
    const query = storageId ? `?storageId=${storageId}` : '';
    return request<Blob>(`/admin/exports/pdf${query}`);
  },
};

// Inventaire public (secouriste)
export const publicInventory = {
  get: (uniqueLink: string) => request<any>(`/inventory/${uniqueLink}`),
  submit: (uniqueLink: string, data: any) =>
    request<any>(`/inventory/${uniqueLink}`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};
