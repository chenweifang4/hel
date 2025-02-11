import { SHARED_KEY } from '../consts';
import { bindInternal, getInternal, getSharedKey, mapSharedState, markSharedKey } from '../helpers/feature';
import { createHeluxObj, createOb } from '../helpers/obj';
import type { Dict, DictN, EenableReactive, ICreateOptions, ModuleName } from '../typing';
import { nodupPush, safeGet } from '../utils';
import { record } from './root';

let depStats: DictN<Array<string>> = {};

function mapDepStats(sharedKey: number) {
  const keys = safeGet(depStats, sharedKey, []);
  return keys;
}

function recordDep(sharedKey: number, stateKey: string | symbol) {
  const keys = mapDepStats(sharedKey);
  nodupPush(keys, stateKey);
}

export function setShared(sharedList: Dict[]) {
  sharedList.forEach((shared) => mapDepStats(getSharedKey(shared)));
}

export function getDepStats() {
  const curDepStats = depStats;
  depStats = {};
  return curDepStats;
}

export function buildSharedObject<T extends Dict = Dict>(
  stateOrStateFn: T | (() => T),
  options?: ModuleName | EenableReactive | ICreateOptions,
): [T, (partialState: Partial<T>) => void] {
  let enableReactive = false;
  let moduleName = '';
  let enableRecordDep = false;

  // for ts check, write 'typeof boolOrCreateOptions' 3 times
  if (typeof options === 'boolean') {
    enableReactive = options;
  }
  if (typeof options === 'string') {
    moduleName = options;
  } else if (options && typeof options === 'object') {
    enableReactive = options.enableReactive ?? false;
    enableRecordDep = options.enableRecordDep ?? false;
    moduleName = options.moduleName || '';
  }

  let rawState = stateOrStateFn as T;
  if (typeof stateOrStateFn === 'function') {
    rawState = stateOrStateFn();
  }

  let heluxObj = createHeluxObj(rawState);
  const sharedKey = markSharedKey(heluxObj);

  let sharedState = {} as unknown as T;
  if (enableReactive) {
    sharedState = createOb(
      heluxObj,
      // setter
      (target, key: any, val) => {
        // @ts-ignore
        heluxObj[key] = val;
        if (SHARED_KEY !== key) {
          getInternal(heluxObj).setState({ [key]: val });
        }
        return true;
      },
      // getter
      (target, key) => {
        if (enableRecordDep) {
          recordDep(sharedKey, key);
        }
        return target[key];
      },
    );
  } else {
    sharedState = heluxObj;
  }

  mapSharedState(sharedKey, sharedState);

  const insKey2Updater: Record<string, any> = {};
  const key2InsKeys: Record<string, number[]> = {};
  bindInternal(sharedState, {
    rawState,
    key2InsKeys,
    insKey2Updater,
    setState(partialState: any) {
      const keys = Object.keys(partialState);
      let allInsKeys: number[] = [];
      keys.forEach((key) => {
        const insKeys = key2InsKeys[key] || [];
        allInsKeys = allInsKeys.concat(insKeys);
      });
      // deduplicate
      allInsKeys = Array.from(new Set(allInsKeys));
      allInsKeys.forEach((insKey) => {
        const updater = insKey2Updater[insKey];
        updater && updater(partialState);
      });
    },
    recordDep(key: string, insKey: number) {
      let insKeys: any[] = key2InsKeys[key];
      if (!insKeys) {
        insKeys = [];
        key2InsKeys[key] = insKeys;
      }
      if (!insKeys.includes(insKey)) {
        insKeys.push(insKey);
      }
    },
    delDep(key: string, insKey: number) {
      const insKeys: any[] = key2InsKeys[key] || [];
      const idx = insKeys.indexOf(insKey);
      if (idx >= 0) {
        insKeys.splice(idx, 1);
      }
    },
    mapInsKeyUpdater(insKey: number, updater: any) {
      insKey2Updater[insKey] = updater;
    },
    delInsKeyUpdater(insKey: number) {
      if (insKey) {
        // @ts-ignore
        delete insKey2Updater[insKey];
      }
    },
  });

  record(moduleName, sharedState);
  return [sharedState, getInternal(sharedState).setState];
}
