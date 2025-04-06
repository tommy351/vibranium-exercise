function pad(num: number) {
  return num.toString().padStart(2, "0");
}

function formatDate(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatTime(date: Date) {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export function DateTime({ value }: { value: Date }) {
  return (
    <time dateTime={value.toISOString()} title={value.toLocaleString()}>
      {formatDate(value)} {formatTime(value)}
    </time>
  );
}
