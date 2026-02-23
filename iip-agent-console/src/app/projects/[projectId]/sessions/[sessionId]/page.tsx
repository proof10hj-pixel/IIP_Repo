import OrchestratorClient from "./orchestrator-client";

export default async function SessionConsole({
  params,
}: {
  params: Promise<{ projectId: string; sessionId: string }>;
}) {
  const { projectId, sessionId } = await params;

  return (
    <div>
      <h3 className="text-xl font-semibold mb-2">Session Console</h3>
      <p className="text-sm text-gray-500 mb-6">
        Project: {projectId} / Session: {sessionId}
      </p>

      <OrchestratorClient />
    </div>
  );
}