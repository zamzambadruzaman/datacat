import { useState } from "react";

export default function SearchBar({
  onSearch,
  placeholder = "Search assets...",
}: {
  onSearch: (q: string) => void;
  placeholder?: string;
}) {
  const [value, setValue] = useState("");

  return (
    <input
      type="text"
      value={value}
      onChange={(e) => {
        setValue(e.target.value);
        onSearch(e.target.value);
      }}
      placeholder={placeholder}
      className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm shadow-sm
                 transition focus:border-fuchsia-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/20"
    />
  );
}
