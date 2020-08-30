import { useCallback, useRef, DependencyList } from "react";
import isEqual from "lodash.isequal";

export const useDeepCallback = <T extends any[], R extends any>(
  callback: (...args: T) => R,
  dependencies: DependencyList
): ((...args: T) => R) => {
  const prevDependencies = useRef<DependencyList>(dependencies);
  const areDeepsEqual = isEqual(prevDependencies.current, dependencies);
  if (!areDeepsEqual) {
    prevDependencies.current = dependencies;
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useCallback(callback, prevDependencies.current);
};
