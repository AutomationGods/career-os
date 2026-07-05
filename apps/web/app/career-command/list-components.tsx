export function CountCard({ label, value }: { label: string; value: string | number }) {
  return <div className="card"><strong>{value}</strong><p className="muted">{label}</p></div>;
}

export function List({ items }: { items: string[] }) {
  if (items.length === 0) return <p className="muted">None yet.</p>;
  return <ul className="compact-list">{items.slice(0, 12).map((item) => <li key={item}>{item}</li>)}</ul>;
}
