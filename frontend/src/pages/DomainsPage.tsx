import DomainList from "../components/DomainList";

export default function DomainsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Domains</h1>
      <DomainList />
    </div>
  );
}
