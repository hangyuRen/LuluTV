export const DANDANPLAY_DEVELOPER_URL = "https://dev.dandanplay.com/";
export const DANMAKU_SETTINGS_HREF = "/settings#danmaku-settings";
export const DANDANPLAY_APP_ID_HEADER = "X-Dandanplay-App-Id";
export const DANDANPLAY_APP_SECRET_HEADER = "X-Dandanplay-App-Secret";
export const DANDANPLAY_CREDENTIAL_MAX_LENGTH = 256;

export function validDandanCredential(value) {
  return typeof value === "string" && value.length <= DANDANPLAY_CREDENTIAL_MAX_LENGTH && /^[!-~]+$/.test(value);
}

export function hasDandanCredentials(credentials) {
  return validDandanCredential(credentials?.appId) && validDandanCredential(credentials?.appSecret);
}
