type Milliseconds = number;

export async function executePromisesWithDelay<T>(
  promises: Promise<T>[],
  chunkSize: number,
  delayRange: { from: Milliseconds; to: Milliseconds }
): Promise<T[]> {
  const result: T[] = [];

  for (let i = 0; i < promises.length; i += chunkSize) {
    const chunkPromises = promises.slice(i, i + chunkSize);
    const chunkResults = await Promise.allSettled(chunkPromises)
      .then((settledPromises) =>
        settledPromises
          .filter((p) => p.status === "fulfilled")
          .map((p) => (p as PromiseFulfilledResult<T>).value)
      )
      .catch((error) => {
        // Handle errors if needed
        console.error("Error:", error);
        return [];
      });

    result.push(...chunkResults);

    const duration = getRandomNumber(delayRange.from, delayRange.to);
    await delay(duration);
  }

  return result;
}

export async function delay(duration: Milliseconds = 0): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, duration));
}

export function getRandomNumber(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}