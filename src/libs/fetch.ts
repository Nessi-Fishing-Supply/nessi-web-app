import { FetchError } from '@/libs/fetch-error';
import useContextStore from '@/features/context/stores/context-store';
import { handleContextRevocation } from '@/features/context/utils/handle-context-revocation';

function getHeaders(body?: unknown): HeadersInit {
  const { activeContext } = useContextStore.getState();
  const headers: HeadersInit = {
    'X-Nessi-Context': activeContext.type === 'member' ? 'member' : `shop:${activeContext.shopId}`,
  };

  if (body !== undefined && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  return headers;
}

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(url, options);

  if (!res.ok) {
    let message = `Request failed with status ${res.status}`;
    try {
      const errorData = await res.json();
      if (errorData.error) message = errorData.error;
      else if (errorData.message) message = errorData.message;
    } catch {
      // Response body is not JSON — use default message
    }
    if (res.status === 403) {
      handleContextRevocation();
    }
    throw new FetchError(message, res.status);
  }

  return res.json();
}

export async function get<T>(url: string): Promise<T> {
  return request<T>(url, { method: 'GET', headers: getHeaders() });
}

export async function post<T>(url: string, body?: unknown): Promise<T> {
  return request<T>(url, {
    method: 'POST',
    headers: getHeaders(body),
    body: body instanceof FormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
  });
}

export async function put<T>(url: string, body?: unknown): Promise<T> {
  return request<T>(url, {
    method: 'PUT',
    headers: getHeaders(body),
    body: body instanceof FormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
  });
}

export async function patch<T>(url: string, body?: unknown): Promise<T> {
  return request<T>(url, {
    method: 'PATCH',
    headers: getHeaders(body),
    body: body instanceof FormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
  });
}

export async function del<T>(url: string): Promise<T> {
  return request<T>(url, { method: 'DELETE', headers: getHeaders() });
}
