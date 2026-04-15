import { translate } from '../i18n';
import { getPreferredLocale } from '../session';

export type ApiError = {
  error: string;
};

export function apiUrl(action: string) {
  return `${import.meta.env.BASE_URL}api/index.php?action=${action}`;
}

export async function request<T>(action: string, options?: RequestInit): Promise<T> {
  const response = await fetch(apiUrl(action), {
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers ?? {}),
    },
    ...options,
  });

  const data = (await response.json()) as T | ApiError;
  if (!response.ok) {
    throw new Error((data as ApiError).error || translate(getPreferredLocale(), 'error.request'));
  }

  return data as T;
}
