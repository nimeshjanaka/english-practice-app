module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    // Reanimated/worklets plugin is auto-added by babel-preset-expo when installed.
  };
};
