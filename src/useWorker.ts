import { useState, useEffect, useRef, useCallback } from "react";
import clone from "lodash.clone";

import { TRANSFERABLE_TYPE, WORKER_STATUS } from "./types";
import createWorkerBlobUrl from "./utils/createWorkerBlobUrl";
import { useDeepCallback } from "./utils/useDeepCallback";

export type WorkerOptions = {
  timeout?: number;
  remoteDependencies: string[];
  autoTerminate: boolean;
  transferable: TRANSFERABLE_TYPE;
};

const PROMISE_RESOLVE = "resolve";
const PROMISE_REJECT = "reject";
const DEFAULT_OPTIONS: WorkerOptions = {
  timeout: undefined,
  remoteDependencies: [],
  autoTerminate: true,
  transferable: TRANSFERABLE_TYPE.AUTO,
};

/**
 *
 * @param {Function} fn the function to run with web worker
 * @param {Object} options useWorker option params
 */
export const useWorker = <T extends any[], R extends any>(
  fn: (...fnArgs: T[]) => R,
  options: Partial<WorkerOptions> = DEFAULT_OPTIONS
): {
  callback: (...fnArgs: T[]) => Promise<R>;
  status: WORKER_STATUS;
  kill: () => void;
} => {
  const [workerStatus, _setWorkerStatus] = useState<WORKER_STATUS>(
    WORKER_STATUS.PENDING
  );
  const worker = useRef<Worker & { _url?: string }>();
  const isRunning = useRef(false);
  const promise = useRef<{
    [PROMISE_REJECT]?: (result: R | ErrorEvent) => void;
    [PROMISE_RESOLVE]?: (result: R) => void;
  }>({});
  const timeoutId = useRef<number>();

  const setWorkerStatus = useCallback((status: WORKER_STATUS) => {
    isRunning.current = status === WORKER_STATUS.RUNNING;
    _setWorkerStatus(status);
  }, []);

  const killWorker = useCallback(() => {
    if (worker.current?._url) {
      worker.current.terminate();
      URL.revokeObjectURL(worker.current._url);
      promise.current = {};
      worker.current = undefined;
      window.clearTimeout(timeoutId.current);
    }
  }, []);

  const onWorkerEnd = useCallback(
    (status: WORKER_STATUS) => {
      const terminate =
        options.autoTerminate != null
          ? options.autoTerminate
          : DEFAULT_OPTIONS.autoTerminate;

      if (terminate) {
        killWorker();
      }
      setWorkerStatus(status);
    },
    [options.autoTerminate, killWorker, setWorkerStatus]
  );

  const generateWorker = useDeepCallback(() => {
    const {
      remoteDependencies = DEFAULT_OPTIONS.remoteDependencies,
      timeout = DEFAULT_OPTIONS.timeout,
      transferable = DEFAULT_OPTIONS.transferable,
    } = options;

    const blobUrl = createWorkerBlobUrl(fn, remoteDependencies, transferable);
    const newWorker: Worker & { _url?: string } = new Worker(blobUrl);
    newWorker._url = blobUrl;

    newWorker.onmessage = (e: MessageEvent) => {
      const [status, result] = e.data as [WORKER_STATUS, R];

      switch (status) {
        case WORKER_STATUS.SUCCESS:
          promise.current[PROMISE_RESOLVE]?.(result);
          onWorkerEnd(WORKER_STATUS.SUCCESS);
          break;
        default:
          promise.current[PROMISE_REJECT]?.(result);
          onWorkerEnd(WORKER_STATUS.ERROR);
          break;
      }
    };

    newWorker.onerror = (e: ErrorEvent) => {
      promise.current[PROMISE_REJECT]?.(e);
      onWorkerEnd(WORKER_STATUS.ERROR);
    };

    if (timeout) {
      timeoutId.current = window.setTimeout(() => {
        killWorker();
        setWorkerStatus(WORKER_STATUS.TIMEOUT_EXPIRED);
      }, timeout);
    }
    return newWorker;
  }, [fn, options, killWorker]);

  const callWorker = useCallback(
    (...workerArgs: T[]) => {
      const { transferable = DEFAULT_OPTIONS.transferable } = options;
      return new Promise<R>((resolve, reject) => {
        promise.current = {
          [PROMISE_RESOLVE]: resolve,
          [PROMISE_REJECT]: reject,
        };
        const transferList: any[] =
          transferable === TRANSFERABLE_TYPE.AUTO
            ? workerArgs.filter(
                (val: any) =>
                  ("ArrayBuffer" in window && val instanceof ArrayBuffer) ||
                  ("MessagePort" in window && val instanceof MessagePort) ||
                  ("ImageBitmap" in window && val instanceof ImageBitmap) ||
                  ("OffscreenCanvas" in window &&
                    val instanceof OffscreenCanvas)
              )
            : [];

        worker.current?.postMessage(clone([workerArgs]), transferList);

        setWorkerStatus(WORKER_STATUS.RUNNING);
      });
    },
    [options, setWorkerStatus]
  );

  const workerHook = useCallback(
    (...fnArgs: T[]) => {
      const terminate =
        options.autoTerminate != null
          ? options.autoTerminate
          : DEFAULT_OPTIONS.autoTerminate;

      if (isRunning.current) {
        /* eslint-disable-next-line no-console */
        console.error(
          "[useWorker] You can only run one instance of the worker at a time, if you want to run more than one in parallel, create another instance with the hook useWorker(). Read more: https://github.com/alewin/useWorker"
        );
        return Promise.reject();
      }
      if (terminate || !worker.current) {
        worker.current = generateWorker();
      }

      return callWorker(...fnArgs);
    },
    [options.autoTerminate, generateWorker, callWorker]
  );

  useEffect(
    () => () => {
      killWorker();
    },
    [killWorker]
  );

  return { callback: workerHook, status: workerStatus, kill: killWorker };
};
