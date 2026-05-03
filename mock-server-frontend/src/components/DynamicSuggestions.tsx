import React from "react";

const suggestions = [
  "id",
  "name",
  "email",
  "status",
  "userId",
  "amount"
];

export default function DynamicSuggestions({ onSelect }: any) {
  return (
    <div className="absolute bg-white border shadow-md rounded text-xs z-50">
      {suggestions.map((item) => (
        <div
          key={item}
          onClick={() => onSelect(item)}
          className="px-3 py-2 hover:bg-slate-100 cursor-pointer"
        >
          {item}
        </div>
      ))}
    </div>
  );
}