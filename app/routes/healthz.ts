const SIGNALS = ["SIGINT", "SIGTERM"];

let exiting = false;

for (const signal of SIGNALS) {
  process.once(signal, () => {
    exiting = true;
  });
}

export async function loader() {
  if (exiting) {
    return new Response("Server unavailable", { status: 503 });
  }

  return new Response("OK");
}
