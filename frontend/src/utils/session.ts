const ACTIVE_USER_ID_KEY = 'stellarsplit.active-user-id';
const AUTH_TOKEN_KEY = 'stellarsplit.auth-token';
const PARTICIPANT_DIRECTORY_KEY = 'stellarsplit.participant-directory';

export interface StoredParticipantIdentity {
  name: string;
  email?: string;
  walletAddress?: string;
}

type StoredParticipantDirectory = Record<
  string,
  Record<string, StoredParticipantIdentity>
>;

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function getStoredActiveUserId(): string | null {
  if (!isBrowser()) {
    return null;
  }

  return window.localStorage.getItem(ACTIVE_USER_ID_KEY);
}

export function setStoredActiveUserId(userId: string | null): void {
  if (!isBrowser()) {
    return;
  }

  if (!userId) {
    window.localStorage.removeItem(ACTIVE_USER_ID_KEY);
    return;
  }

  window.localStorage.setItem(ACTIVE_USER_ID_KEY, userId);
}

export function getStoredAuthToken(): string | null {
  if (!isBrowser()) {
    return null;
  }

  return window.localStorage.getItem(AUTH_TOKEN_KEY);
}

export function setStoredAuthToken(token: string | null): void {
  if (!isBrowser()) {
    return;
  }

  if (!token) {
    window.localStorage.removeItem(AUTH_TOKEN_KEY);
    return;
  }

  window.localStorage.setItem(AUTH_TOKEN_KEY, token);
}

function readParticipantDirectory(): StoredParticipantDirectory {
  if (!isBrowser()) {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(PARTICIPANT_DIRECTORY_KEY);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw) as StoredParticipantDirectory;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeParticipantDirectory(directory: StoredParticipantDirectory): void {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(
    PARTICIPANT_DIRECTORY_KEY,
    JSON.stringify(directory),
  );
}

export function storeSplitParticipantDirectory(
  splitId: string,
  identities: Record<string, StoredParticipantIdentity>,
): void {
  if (!splitId || Object.keys(identities).length === 0) {
    return;
  }

  const currentDirectory = readParticipantDirectory();
  currentDirectory[splitId] = {
    ...(currentDirectory[splitId] ?? {}),
    ...identities,
  };
  writeParticipantDirectory(currentDirectory);
}

export function getStoredSplitParticipantDirectory(
  splitId: string,
): Record<string, StoredParticipantIdentity> {
  return readParticipantDirectory()[splitId] ?? {};
}
