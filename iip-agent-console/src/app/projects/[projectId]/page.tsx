import Link from "next/link";

export default async function ProjectDashboard({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  return (
    <div>
      <div className="mb-4">
        <h3 className="text-xl font-semibold">Project: {projectId}</h3>
        <p className="text-sm text-gray-500">Sessions & overview</p>
      </div>

      <div className="mb-6 flex gap-2">
        <Link
          href={`/projects/${projectId}/sessions/demo-session`}
          className="px-4 py-2 bg-black text-white rounded"
        >
          Open Demo Session
        </Link>
      </div>

      <div className="bg-white rounded shadow p-4">
        <h4 className="font-semibold mb-2">Sessions</h4>
        <div className="text-sm text-gray-600">
          Demo session available. (Mock list for now)
        </div>
      </div>
    </div>
  );
}