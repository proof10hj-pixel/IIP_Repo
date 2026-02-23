"use client";

import { useState } from "react";

export default function ApprovalModal({
  open,
  env,
  actionName,
  risk,
  onApprove,
  onClose,
}: {
  open: boolean;
  env: "DEV" | "STG" | "PRD";
  actionName: string;
  risk: "Low" | "Medium" | "High";
  onApprove: () => void;
  onClose: () => void;
}) {
  const [typed, setTyped] = useState("");
  const [second, setSecond] = useState(false);

  if (!open) return null;

  const isPRD = env === "PRD";
  const canApprove = typed === "APPROVE" && (!isPRD || second);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="w-[520px] bg-white rounded shadow p-6">
        <h3 className="text-lg font-semibold mb-2">Approval Required</h3>
        <p className="text-sm text-gray-600 mb-4">
          Action: <b>{actionName}</b> / Risk: <b>{risk}</b> / Env: <b>{env}</b>
        </p>

        <label className="text-sm font-medium">Type "APPROVE" to confirm</label>
        <input
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          className="mt-1 w-full border rounded px-3 py-2"
          placeholder="APPROVE"
        />

        {isPRD && (
          <label className="flex items-center gap-2 mt-3 text-sm">
            <input
              type="checkbox"
              checked={second}
              onChange={(e) => setSecond(e.target.checked)}
            />
            2nd confirmation required for PRD
          </label>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            className="px-4 py-2 rounded border"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className={`px-4 py-2 rounded text-white ${
              canApprove ? "bg-black" : "bg-gray-400"
            }`}
            disabled={!canApprove}
            onClick={onApprove}
          >
            Approve & Execute
          </button>
        </div>
      </div>
    </div>
  );
}