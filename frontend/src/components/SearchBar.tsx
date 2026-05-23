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
      className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm
                 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
    />
  );
}
