/*
|--------------------------------------------------------------------------
| ATTENTION:
| 此包只能被每个应用独立安装，将此包提升到 external 将会导致 isSubApp 失效
|--------------------------------------------------------------------------
*/

// iso 模块加载信息
var info = getIsoInfo();
tryMarkFlag();
var cachedIsMaster = getIsMaster();

/**
 * @returns {typeof globalThis}
 */
function getGlobalThis() {
  return window || global;
}
function getIsoInfo() {
  var _getGlobalThis = getGlobalThis(),
    __HEL_ISO_FLAG__ = _getGlobalThis.__HEL_ISO_FLAG__,
    __MASTER_APP_LOADED__ = _getGlobalThis.__MASTER_APP_LOADED__;
  return {
    /** 是否是第一个载入 hel-iso 模块 */
    isFirstMod: __HEL_ISO_FLAG__ === undefined,
    /** 是否是在 hel-micro-core 之前载入的 */
    isBeforeCore: __MASTER_APP_LOADED__ === undefined,
  };
}
function tryMarkFlag() {
  var globalThis = getGlobalThis();
  // 启用新的名称 __HEL_ISO_FLAG__ 替代 hel-micro-core 里的 __MASTER_APP_LOADED__
  // 确保 hel-iso 在被并调用 isMasterApp 时能够正确推断是否主应用
  if (globalThis.__HEL_ISO_FLAG__ === undefined) {
    globalThis.__HEL_ISO_FLAG__ = 1;
  }
}
function getCodeHost() {
  var loc = '';
  try {
    throw new Error('codeHost');
  } catch (err) {
    var stackArr = err.stack.split('\n');
    loc = stackArr[stackArr.length - 1] || '';
  }

  // case 1 codeHost will be ''
  // "    at _next (webpack-internal:///./node_modules/@babel/runtime/helpers/esm/asyncToGenerator.js:31:9)"
  // case 2 codeHost will be 'localhost:3103'
  // at main (http://localhost:3103/static/js/bundle.js:343:60)
  var str = loc.split('//')[1] || ''; // str after double slash
  var codeHost = str.split('/')[0];
  return codeHost;
}
function getIsMaster() {
  var globalThis = getGlobalThis();
  var location = globalThis.location,
    microShared = globalThis.__HEL_MICRO_SHARED__;
  var isFirstMod = info.isFirstMod,
    isBeforeCore = info.isBeforeCore;

  // 如果不是第一个载入的，一定是子模块
  if (!isFirstMod) {
    return false;
  }
  // 以下逻辑开始，当前 iso 模式是【第一个载入的】，按道理可以返回 true 表示前应用是主应用了
  // 但为了兼容 iso 和 core 共存时，依然能正确判断当前应用是否是主应用，所以继续加入其他判断条件
  // -----------------------------------------------------------------------------
  // 在 core 之前加载
  if (isBeforeCore) {
    return true;
  }

  // 当前运行环境和代码的位置一致，一定是主应用
  var codeHost = getCodeHost();
  if (location && location.host === codeHost) {
    return true;
  }

  // codeHost 判断失败时，再看 microShared
  if (microShared) {
    var map = microShared.cacheRoot.appGroupName2platform;
    // 无任何相关子模块数据，一定是主应用
    if (!Object.keys(map).length) {
      return true;
    }
  }
  return false;
}

/**
 * 是否是主应用
 * @returns
 */
function isMasterApp$1() {
  return cachedIsMaster;
}
function isSubApp$1() {
  return !isMasterApp$1();
}

var isMasterApp = isMasterApp$1,
  isSubApp = isSubApp$1;
var index = {
  isSubApp: isSubApp,
  isMasterApp: isMasterApp,
};

export { index as default, isMasterApp, isSubApp };
