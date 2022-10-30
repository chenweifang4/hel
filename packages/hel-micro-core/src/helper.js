import { DEFAULT_PLAT } from './consts';
import { getHelMicroShared, makeCacheNode } from './microShared';

/**
 * 获取默认的平台值
 * @returns
 */
export function getPlatform() {
  // 后续可能会计划彻底不再支持重置平台默认值
  return getHelMicroShared().cacheRoot.platform || DEFAULT_PLAT;
}

/**
 * @param {string} platform
 */
export function getPlatformSharedCache(platform) {
  const p = platform || getPlatform();
  const cacheRoot = getCacheRoot();
  let cacheNode = cacheRoot.caches[p];
  if (!cacheNode) {
    const platCache = makeCacheNode(platform);
    cacheRoot.caches[p] = platCache;
    cacheNode = platCache;
  }
  return cacheNode;
}

export function getCacheRoot() {
  return getHelMicroShared().cacheRoot;
}
