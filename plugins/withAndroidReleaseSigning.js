/**
 * 让 Android release 构建使用自己的签名密钥，而不是 RN 模板默认的 debug 签名。
 *
 * 为什么必须这么做：
 *   OTA 更新能装上的前提是「新包与已安装 App 的签名一致」。
 *   RN 模板里 release buildType 也指向 signingConfigs.debug，而 debug.keystore
 *   是公开的（密码就是字面量 'android'）。用它签出来的包没有任何辨识度，
 *   而且一旦 Expo 换了模板里的 debug.keystore，已安装的 App 就再也收不到更新。
 *
 * 签名信息一律从环境变量读，绝不写进仓库：
 *   ANDROID_KEYSTORE_PATH       keystore 路径（相对于 app/ 目录）
 *   ANDROID_KEYSTORE_PASSWORD   keystore 密码
 *   ANDROID_KEY_ALIAS           密钥别名
 *   ANDROID_KEY_PASSWORD        别名密码
 *
 * 这个插件是幂等的：重复 prebuild 不会重复注入。
 */
const { withAppBuildGradle } = require('@expo/config-plugins');

const RELEASE_SIGNING_CONFIG = `
        release {
            storeFile file(System.getenv("ANDROID_KEYSTORE_PATH") ?: "release.keystore")
            storePassword System.getenv("ANDROID_KEYSTORE_PASSWORD")
            keyAlias System.getenv("ANDROID_KEY_ALIAS")
            keyPassword System.getenv("ANDROID_KEY_PASSWORD")
        }`;

module.exports = function withAndroidReleaseSigning(config) {
  return withAppBuildGradle(config, (cfg) => {
    if (cfg.modResults.language !== 'groovy') {
      throw new Error(
        '[withAndroidReleaseSigning] 只支持 groovy 格式的 app/build.gradle'
      );
    }

    let src = cfg.modResults.contents;

    // 幂等保护：已经注入过就直接返回
    if (src.includes('signingConfigs.release')) {
      return cfg;
    }

    // 1) 让 release buildType 改用 release 签名。
    //    用 RN 模板自带的注释来定位，避免误伤 debug buildType 里同名的 signingConfig。
    const before = src;
    src = src.replace(
      /(\/\/ Caution! In production[\s\S]*?)signingConfig\s+signingConfigs\.debug/,
      '$1signingConfig signingConfigs.release'
    );
    if (src === before) {
      throw new Error(
        '[withAndroidReleaseSigning] 未能在 app/build.gradle 中定位 release buildType，' +
          'RN 模板结构可能已变化，请人工检查后再构建'
      );
    }

    // 2) 在 signingConfigs 块里补上 release 配置
    src = src.replace(/(signingConfigs\s*\{)/, `$1${RELEASE_SIGNING_CONFIG}`);

    cfg.modResults.contents = src;
    return cfg;
  });
};
