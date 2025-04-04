function pad(num: number) {
  return num.toString().padStart(2, "0");
}

function formatDate(date: Date) {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth())}-${pad(date.getUTCDay())}`;
}

function formatTime(date: Date) {
  return `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`;
}

export function DateTime({ value }: { value: Date }) {
  return (
    <time dateTime={value.toISOString()}>
      {formatDate(value)} {formatTime(value)} UTC
    </time>
  );
}
