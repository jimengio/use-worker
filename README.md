# use-worker

Use web workers with react hook

[![npm](https://img.shields.io/npm/v/@jimengio/use-worker.svg)](https://www.npmjs.com/package/@jimengio/use-worker)

Fork: https://github.com/alewin/useWorker

## Usage

```shell
yarn add @jimengio/use-worker
```

```jsx
import React from "react";
import { useWorker } from "@jimengio/use-worker";

const numbers = [...Array(5000000)].map((e) => ~~(Math.random() * 1000000));
const sortNumbers = (nums) => nums.sort();

const Example = () => {
  const { callback: sortWorker } = useWorker(sortNumbers);

  const runSort = async () => {
    const result = await sortWorker(numbers); // non-blocking UI
    console.log("End.");
  };

  return (
    <button type="button" onClick={runSort}>
      Run Sort
    </button>
  );
};
```

## Dev

```shell
# build package
yarn build

# tests
yarn test

# lint
yarn eslint
```

## License

[MIT](./LICENSE)
