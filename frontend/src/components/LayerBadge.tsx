import { DataLayer } from "../api";

export default function LayerBadge({ layer }: { layer: Pick<DataLayer, "name" | "color"> }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium"
      style={{ color: layer.color, backgroundColor: `${layer.color}1A` }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: layer.color }} />
      {layer.name}
    </span>
  );
}
