import React from "react";

const options = [
  { label: "UUID", value: "{{uuid}}" },
  { label: "Timestamp", value: "{{timestamp}}" },
  { label: "Random String", value: "{{randomString(5,10)}}" },
  { label: "Random Int", value: "{{randomInt(1,100)}}" },
  { label: "Body Field", value: "{{body.}}" },
  { label: "Query Param", value: "{{query.}}" },
  { label: "Path Param", value: "{{path.}}" },
];

export default function DynamicInsert({ onInsert }: any) {
  return (
    <div className="flex gap-2 flex-wrap mb-2">
      {options.map((opt) => (
        <button
          key={opt.label}
          type="button"
          onClick={() => onInsert(opt.value)}
          className="text-xs border px-2 py-1 rounded hover:bg-slate-100"
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}