// Launches the official Playwright MCP server.
// Cloud sessions use the preinstalled Chromium in headless mode;
// local machines use the default browser (Chrome) with a visible window.
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";

const cloudChromium = "/opt/pw-browsers/chromium";
const args = ["-y", "@playwright/mcp@latest"];
if (existsSync(cloudChromium)) {
  args.push("--headless", "--browser", "chromium", "--executable-path", cloudChromium);
}

const child = spawn("npx", args, { stdio: "inherit", shell: process.platform === "win32" });
child.on("exit", (code) => process.exit(code ?? 0));
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => child.kill(sig));
