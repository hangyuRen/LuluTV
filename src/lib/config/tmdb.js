export const TMDB_API_APPLICATION_URL = "https://www.themoviedb.org/settings/api";
export const TMDB_SETTINGS_HREF = "/settings#tmdb-settings";
export const TMDB_KEY_HEADER = "X-TMDB-API-Key";
export const TMDB_KEY_MAX_LENGTH = 128;

export function isTmdbApiKey(value) {
  return value.length <= TMDB_KEY_MAX_LENGTH && /^[a-zA-Z0-9_-]+$/.test(value);
}
