/** Served at https://your-host/quiz_f/ (not site root). Sync nginx/apache alias with this. */
const BASE_PATH = "/quiz_f";

/** @type {import('next').NextConfig} */
module.exports = {
  basePath: BASE_PATH,
  turbopack: {
    root: __dirname,
  },
  // Static HTML/CSS/JS — produces `out`, renamed to `build` by npm script.
  output: "export",
  /** Puts routes at `/scoreboard/index.html` so `/quiz_f/scoreboard/` works on nginx (no empty dir 403). */
  trailingSlash: true,
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "4000",
        pathname: "/uploads/**",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "4000",
        pathname: "/uploads/**",
      },
    ],
  },
};

