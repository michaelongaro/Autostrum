/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
await import("./src/env.mjs");

/** @type {import("next").NextConfig} */
const config = {
  reactStrictMode: true,
  images: {
    domains: ["images.clerk.dev", "www.gravatar.com", "img.clerk.com"],
  },
  typescript: {
    ignoreBuildErrors: true, // ideally don't want this, but our types are very transient right now
  },
  eslint: {
    ignoreDuringBuilds: true, // "                                                                 "
  },
  /**
   * If you have `experimental: { appDir: true }` set, then you must comment the below `i18n` config
   * out.
   *
   * @see https://github.com/vercel/next.js/issues/41980
   */
  i18n: {
    locales: ["en"],
    defaultLocale: "en",
  },
  transpilePackages: ["three"],
};
export default config;
