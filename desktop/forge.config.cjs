const path = require("node:path");

const icon = path.join(__dirname, "icons", "LuluTV");
const macSigning = process.env.MAC_SIGN_IDENTITY ? {
  osxSign: { identity: process.env.MAC_SIGN_IDENTITY },
  osxNotarize: process.env.APPLE_ID ? {
    appleId: process.env.APPLE_ID,
    appleIdPassword: process.env.APPLE_APP_SPECIFIC_PASSWORD,
    teamId: process.env.APPLE_TEAM_ID,
  } : undefined,
} : {};

module.exports = {
  packagerConfig: {
    appBundleId: "com.lulutv.desktop",
    executableName: "LuluTV",
    asar: true,
    icon,
    extraResource: [path.join(__dirname, "runtime")],
    ignore: [/^\/runtime(?:\/|$)/, /^\/icons(?:\/|$)/, /^\/prepare\.cjs$/, /^\/forge\.config\.cjs$/],
    ...macSigning,
  },
  makers: [
    { name: "@electron-forge/maker-zip", platforms: ["darwin"] },
    { name: "@electron-forge/maker-squirrel", platforms: ["win32"], config: {
      name: "lulutv",
      setupIcon: `${icon}.ico`,
      ...(process.env.WINDOWS_CERTIFICATE_FILE ? {
        certificateFile: process.env.WINDOWS_CERTIFICATE_FILE,
        certificatePassword: process.env.WINDOWS_CERTIFICATE_PASSWORD,
      } : {}),
    } },
  ],
};
