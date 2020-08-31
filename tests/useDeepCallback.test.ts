import { useEffect, useRef } from "react";
import { renderHook } from "@testing-library/react-hooks";

import { useDeepCallback } from "../src/utils/useDeepCallback";

describe("useDeepCallback", () => {
  const obj1 = { a: 1, b: { b1: 2 } };
  const obj2 = { a: 1, b: { b1: 2 } };
  const obj3 = { a: 1, b: { b1: 0 } };

  it("should be defined", () => {
    expect(useDeepCallback).toBeDefined();
  });

  it("Same deps", (done) => {
    const { rerender } = renderHook(
      ({ obj }) => {
        const firstRenderRef = useRef(true);

        const callback = useDeepCallback(() => {
          console.log("callback");
        }, [obj]);

        useEffect(() => {
          if (firstRenderRef.current) {
            firstRenderRef.current = false;
          } else {
            done.fail("Trigger the same deps");
          }
        }, [callback]);

        return null;
      },
      {
        initialProps: { obj: obj1 },
      }
    );

    rerender();

    rerender({ obj: obj1 });
    rerender({ obj: obj2 });
    done();
  });

  it("Different deps", () => {
    const { rerender } = renderHook(
      ({ obj }) => {
        const firstRenderRef = useRef(true);

        const callback = useDeepCallback(() => {
          console.log("callback");
        }, [obj]);

        useEffect(() => {
          if (firstRenderRef.current) {
            firstRenderRef.current = false;
            expect(obj).toEqual(obj1);
          } else {
            expect(obj).toEqual(obj3);
          }
          // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [callback]);

        return null;
      },
      {
        initialProps: { obj: obj1 },
      }
    );

    // init
    rerender();

    rerender({ obj: obj3 });
  });
});
