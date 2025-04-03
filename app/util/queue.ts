import PQueue from "p-queue";
import { logger } from "./log";

const queue = new PQueue();

export function runInBackground(task: () => Promise<void>) {
  void queue.add(() =>
    task().catch((err) => logger.error({ err }, "Task failed")),
  );
}
