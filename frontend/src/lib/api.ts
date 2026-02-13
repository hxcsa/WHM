"use client";

import { auth } from "./firebase";

const REQUEST_TIMEOUT_MS = 15000;
let tokenPromise: Promise<string | null> | null = null;

async function getAuthToken(forceRefresh = false): Promise<string | null> {
    const user = auth.currentUser;
    if (!user) return null;

    if (!forceRefresh && tokenPromise) {
        return tokenPromise;
    }

    tokenPromise = user
        .getIdToken(forceRefresh)
        .then((token: string) => token ?? null)
        .catch(() => null)
        .finally(() => {
            tokenPromise = null;
        });

    return tokenPromise;
}

function buildHeaders(options: RequestInit, token: string | null): Headers {
    const headers = new Headers(options.headers ?? {});
    if (token) headers.set("Authorization", `Bearer ${token}`);

    const hasBody = options.body !== undefined && options.body !== null;
    const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
    if (hasBody && !isFormData && !headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
    }

    return headers;
}

export async function fetchWithAuth(url: string, options: RequestInit = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
        const token = await getAuthToken(false);
        let response = await fetch(url, {
            ...options,
            headers: buildHeaders(options, token),
            signal: options.signal ?? controller.signal,
        });

        if (response.status === 401 && auth.currentUser) {
            const refreshed = await getAuthToken(true);
            if (refreshed) {
                response = await fetch(url, {
                    ...options,
                    headers: buildHeaders(options, refreshed),
                    signal: options.signal ?? controller.signal,
                });
            }
        }

        return response;
    } finally {
        clearTimeout(timeout);
    }
}

export async function fetchJsonWithAuth<T>(url: string, options: RequestInit = {}): Promise<T> {
    const response = await fetchWithAuth(url, options);
    if (!response.ok) {
        const message = await response.text();
        throw new Error(message || `Request failed: ${response.status}`);
    }
    return response.json() as Promise<T>;
}
