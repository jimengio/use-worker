import React, { DependencyList } from 'react'
import isEqual from 'lodash.isequal'

export const useDeepCallback = <T extends (...args: any[]) => any>(
  callback: T, dependencies: DependencyList,
) => {
  const prevDependencies = React.useRef<DependencyList>(dependencies)
  const areDeepsEqual = isEqual(prevDependencies.current, dependencies)
  if (!areDeepsEqual) {
    prevDependencies.current = dependencies
  }

  return React.useCallback(callback, prevDependencies.current)
}
