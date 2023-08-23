export default function formatDate(date: Date) {
  const d = new Date(date);
  const month = `${d.getMonth() + 1}`;
  const day = `${d.getDate()}`;
  const year = d.getFullYear();

  return [month, day, year].join("/");
}
