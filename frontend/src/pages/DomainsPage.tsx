import DomainList from "../components/DomainList";

export default function DomainsPage() {
  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-semibold tracking-tight text-gray-900">Domains</h1>
      <DomainList />
    </div>
  );
}
