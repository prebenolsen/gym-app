// Dynamic Expo config. `app.json` stays the source of truth; this only layers on
// the web base path, which differs per deploy target:
//
//   - local dev / preview  -> '' (served from the domain root)
//   - GitHub Pages project site -> '/gym-app' (served from a repo subpath)
//
// GitHub Pages serves project sites at https://<user>.github.io/<repo>/, so every
// bundled asset URL has to be prefixed or the app 404s. The deploy workflow sets
// EXPO_BASE_URL; everything hand-written under public/ uses relative URLs instead,
// so it needs no prefixing.
export default ({ config }) => {
  const baseUrl = process.env.EXPO_BASE_URL ?? '';

  return {
    ...config,
    experiments: {
      ...config.experiments,
      baseUrl,
    },
  };
};
