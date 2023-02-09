const plugins = [
  [
    "@babel/plugin-proposal-decorators",
    {
      legacy: true,
    },
  ],
  ["@babel/plugin-proposal-optional-catch-binding"],
  "react-native-reanimated/plugin", // NOTE: this must be last in the plugins
  '@babel/plugin-proposal-export-namespace-from',
]

const vanillaConfig = {
  presets: ["module:metro-react-native-babel-preset"],
  env: {
    production: {},
  },
  plugins
}

const expoConfig = {
  presets: ["babel-preset-expo", 'module:metro-react-native-babel-preset'],
  env: {
    production: {},
  },
  plugins,
}

let isExpo = true
try {
  const Constants = require("expo-constants")
  // True if the app is running in an `expo build` app or if it's running in Expo Go.
  isExpo =
    Constants.executionEnvironment === "standalone" ||
    Constants.executionEnvironment === "storeClient"
} catch {}

const babelConfig = isExpo ? expoConfig : vanillaConfig

module.exports = babelConfig
