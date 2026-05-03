import { useEffect, useState } from "react";

const CurlPreview = ({ endpoint, method, headers, body }: any) => {
  const [curl, setCurl] = useState("");

  useEffect(() => {
    if (!endpoint) {
      setCurl("");
      return;
    }

    let c = `curl -X ${method} "http://localhost:8080${endpoint}"`;

    if (headers) {
      Object.entries(headers).forEach(([k, v]) => {
        if (k && v) {
          c += ` \\\n  -H "${k}: ${v}"`;
        }
      });
    }

    if (body && body.trim()) {
      c += ` \\\n  -d '${body}'`;
    }

    setCurl(c);
  }, [endpoint, method, headers, body]);

  return (
    <div className="bg-black text-green-400 p-4 rounded-md text-sm whitespace-pre-wrap">
      {curl || "Fill fields to generate curl"}
    </div>
  );
};

export default CurlPreview;