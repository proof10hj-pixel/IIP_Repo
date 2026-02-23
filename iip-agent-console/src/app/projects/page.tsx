import Link from "next/link";

export default function ProjectsPage() {
  return (
    <div>
      <h3 className="text-xl font-semibold mb-4">Projects</h3>

      <div className="grid grid-cols-3 gap-6">
        <Link href="/projects/demo">
          <div className="bg-white p-6 rounded shadow hover:shadow-lg transition cursor-pointer">
            <h4 className="font-semibold mb-2">Demo Project</h4>
            <p className="text-sm text-gray-500">Sample agentic integration project</p>
          </div>
        </Link>
      </div>
    </div>
  );
}