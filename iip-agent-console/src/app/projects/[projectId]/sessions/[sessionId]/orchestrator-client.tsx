"use client";

import { useMemo, useState } from "react";
import ApprovalModal from "@/components/ApprovalModal";
import { BadgeTag } from "@/components/BadgeTag";
import { createSessionGraph } from "@/lib/seed";

type Env = "DEV" | "STG" | "PRD";
type StepState = "Pending" | "Running" | "Success" | "Failed" | "Skipped";

type AuditItem = {
  ts: string;
  stepName: string;
  actionName: string;
  result: "SUCCESS" | "FAILED";
  message: string;
};

export default function OrchestratorClient() {
  const env: Env = "DEV";

  // graph template
  const graph = useMemo(() => createSessionGraph(env), [env]);

  // local runtime state (step states + outputs + logs)
  const [stepStates, setStepStates] = useState<Record<string, StepState>>(() =>
    Object.fromEntries(graph.map((s) => [s.id, s.state as StepState]))
  );

  const [selectedStepId, setSelectedStepId] = useState(graph[0]?.id);

  // requirement input (meaningful input)
  const [requirement, setRequirement] = useState(
    "As a user, I want an API that receives an order and routes it to legacy system with transformation and retries."
  );

  // outputs (meaningful results)
  const [intentOutput, setIntentOutput] = useState<any>(null);
  const [oasOutput, setOasOutput] = useState<any>(null);

  const [muleOutput, setMuleOutput] = useState<null | {
    muleXml: string;
    dataWeave: string;
    properties: string;
  }>(null);

  const [diffs, setDiffs] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const [pendingSave, setPendingSave] = useState<null | {
    actionName: string;
    risk: "Low" | "Medium" | "High";
  }>(null);

  // audit log
  const [audit, setAudit] = useState<AuditItem[]>([]);

  // approval modal
  const [approvalOpen, setApprovalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<null | {
    stepId: string;
    stepName: string;
    action: any;
  }>(null);

  // Test state
  const [apiTestCases, setApiTestCases] = useState<any>(null);
  const [testReport, setTestReport] = useState<any>(null);

  // Deploy / Observe / Debug state
  const [deployReport, setDeployReport] = useState<any>(null);
  const [evidencePack, setEvidencePack] = useState<any>(null);

  const [debugReport, setDebugReport] = useState<any>(null);
  const [patchProposal, setPatchProposal] = useState<any>(null);

  const selectedStep = graph.find((s) => s.id === selectedStepId);

  const setStep = (stepId: string, state: StepState) => {
    setStepStates((prev) => ({ ...prev, [stepId]: state }));
  };

  const addAudit = (item: AuditItem) => {
    setAudit((prev) => [item, ...prev].slice(0, 20));
  };

  // ---- Mock "Compile Intent" implementation (meaningful!) ----
  const runCompileIntent = async (stepId: string, actionName: string) => {
    setStep(stepId, "Running");

    // small delay to show Running state
    await new Promise((r) => setTimeout(r, 400));

    // Minimal structured output (later replace with LLM / backend)
    const output = {
      requirement,
      constraints: {
        env,
        approvalModel: "[A]/[C]/[H]",
        secrets: "Do not log tokens/PII (masking enabled)",
      },
      derived: {
        apiStyle: "REST",
        resources: ["/orders"],
        legacyTargets: ["TCP/HTTP/File/DB/MQ (placeholder)"],
        transformations: ["DataWeave mapping required"],
        tests: ["API tests + E2E workflow tests"],
        deploy: ["DEV/STG/PRD separated"],
      },
      plan: [
        "Design: generate OAS and apply guardrails",
        "Build: generate Mule flows + connector configs + DataWeave",
        "Test: auto-generate cases and run with approval",
        "Deploy: deploy to env with approval",
        "Observe/Debug: collect evidence and localize root cause",
      ],
    };

    setIntentOutput(output);
    setStep(stepId, "Success");

    addAudit({
      ts: new Date().toISOString(),
      stepName: "Intent",
      actionName,
      result: "SUCCESS",
      message: "Intent compiled and stored in session output.",
    });
  };

  const runGenerateOAS = async (stepId: string, actionName: string) => {
    setStep(stepId, "Running");
    await new Promise((r) => setTimeout(r, 500));

    // intentOutput이 없으면 실패 처리
    if (!intentOutput) {
      setStep(stepId, "Failed");
      addAudit({
        ts: new Date().toISOString(),
        stepName: "Design",
        actionName,
        result: "FAILED",
        message: "No Intent Output. Run 'Compile Intent' first.",
      });
      return;
    }

    // Account inquiry API mock OAS (based on intent)
    const oas = {
      openapi: "3.0.3",
      info: {
        title: "Account Inquiry API",
        version: "1.0.0",
        description:
          "Generated from Intent. Mule flow will call legacy system and return normalized JSON.",
      },
      servers: [{ url: "https://api.example.com" }],
      paths: {
        "/accounts/{accountNo}": {
          get: {
            summary: "Retrieve account information",
            description:
              "Calls legacy system via Mule flow and transforms response using DataWeave.",
            parameters: [
              {
                name: "accountNo",
                in: "path",
                required: true,
                schema: { type: "string" },
                description: "Account number",
              },
              {
                name: "asOfDate",
                in: "query",
                required: false,
                schema: { type: "string", format: "date" },
                description: "Inquiry 기준일(선택)",
              },
              {
                name: "customerId",
                in: "query",
                required: false,
                schema: { type: "string" },
                description: "고객 식별자(선택)",
              },
            ],
            responses: {
              "200": {
                description: "Account detail response",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        accountNo: { type: "string" },
                        balance: { type: "number" },
                        currency: { type: "string" },
                        status: {
                          type: "string",
                          enum: ["ACTIVE", "DORMANT", "CLOSED"],
                        },
                        asOfDate: { type: "string", format: "date" },
                      },
                      required: ["accountNo", "balance", "currency", "status"],
                    },
                  },
                },
              },
              "400": {
                description: "Validation error",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        code: { type: "string", example: "VALIDATION_ERROR" },
                        message: { type: "string" },
                      },
                      required: ["code", "message"],
                    },
                  },
                },
              },
              "401": { description: "Unauthorized" },
              "403": { description: "Forbidden" },
              "500": { description: "Internal server error" },
            },
            security: [{ bearerAuth: [] }],
          },
        },
      },
      components: {
        securitySchemes: {
          bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
        },
      },
      "x-generatedFrom": {
        requirement: intentOutput.requirement,
        plan: intentOutput.plan,
        constraints: intentOutput.constraints,
      },
    };

    setOasOutput(oas);
    setStep(stepId, "Success");

    addAudit({
      ts: new Date().toISOString(),
      stepName: "Design",
      actionName,
      result: "SUCCESS",
      message: "OAS generated from Intent and stored in session output.",
    });
  };

  const runGenerateMule = async (stepId: string, actionName: string) => {
    setStep(stepId, "Running");
    await new Promise((r) => setTimeout(r, 600));

    if (!intentOutput || !oasOutput) {
      setStep(stepId, "Failed");
      addAudit({
        ts: new Date().toISOString(),
        stepName: "Build",
        actionName,
        result: "FAILED",
        message: "Missing Intent or OAS. Run Intent → Design first.",
      });
      return;
    }

    // Demo Mule artifacts (string templates)
    const muleXml = `<?xml version="1.0" encoding="UTF-8"?>
<mule xmlns:http="http://www.mulesoft.org/schema/mule/http"
      xmlns:ee="http://www.mulesoft.org/schema/mule/ee/core"
      xmlns="http://www.mulesoft.org/schema/mule/core"
      xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
      xsi:schemaLocation="
        http://www.mulesoft.org/schema/mule/core http://www.mulesoft.org/schema/mule/core/current/mule.xsd
        http://www.mulesoft.org/schema/mule/http http://www.mulesoft.org/schema/mule/http/current/mule-http.xsd
        http://www.mulesoft.org/schema/mule/ee/core http://www.mulesoft.org/schema/mule/ee/core/current/mule-ee.xsd">

  <!-- Generated from Intent + OAS -->
  <configuration-properties file="config.properties"/>

  <http:listener-config name="httpListener">
    <http:listener-connection host="\${http.host}" port="\${http.port}"/>
  </http:listener-config>

  <!-- Legacy call placeholder: can be TCP/HTTP/DB/MQ connector depending on target -->
  <flow name="account-inquiry-flow">
    <http:listener config-ref="httpListener" path="/accounts/{accountNo}" allowedMethods="GET"/>

    <!-- Input validation / normalization (mock) -->
    <set-variable variableName="accountNo" value="#[attributes.uriParams.accountNo]"/>
    <set-variable variableName="asOfDate" value="#[attributes.queryParams.asOfDate default null]"/>

    <!-- Legacy request build (placeholder) -->
    <ee:transform doc:name="Build Legacy Request">
      <ee:message>
        <ee:set-payload><![CDATA[%dw 2.0
output application/json
---
{
  accountNo: vars.accountNo,
  asOfDate: vars.asOfDate,
  customerId: attributes.queryParams.customerId default null
}]]></ee:set-payload>
      </ee:message>
    </ee:transform>

    <!-- TODO: replace with real connector call -->
    <logger level="INFO" message="Calling legacy system endpoint=\${legacy.baseUrl} (placeholder) payload=#[payload]"/>

    <!-- Mock legacy response -->
    <set-payload><![CDATA[{
      "acct_no": "#[vars.accountNo]",
      "bal": 120000.25,
      "ccy": "KRW",
      "acct_status": "ACTIVE",
      "as_of": "2026-02-22"
    }]]></set-payload>

    <!-- Normalize response using DataWeave -->
    <ee:transform doc:name="Normalize Response (DataWeave)">
      <ee:message>
        <ee:set-payload><![CDATA[%dw 2.0
import * from dw::core::Strings
output application/json
var src = payload
---
{
  accountNo: src.acct_no as String,
  balance: src.bal as Number,
  currency: src.ccy as String,
  status: upper(src.acct_status as String),
  asOfDate: src.as_of as String
}]]></ee:set-payload>
      </ee:message>
    </ee:transform>

  </flow>
</mule>`;

    const dataWeave = `%dw 2.0
output application/json
// account-inquiry.dwl (Generated)
var src = payload
---
{
  accountNo: src.acct_no as String,
  balance: src.bal as Number,
  currency: src.ccy as String,
  status: upper(src.acct_status as String),
  asOfDate: src.as_of as String
}`;

    const properties = `# config.properties (Generated)
http.host=0.0.0.0
http.port=8081

# legacy endpoint placeholder
legacy.baseUrl=https://legacy.example.com
legacy.timeoutMs=3000
legacy.retry=2
`;

    setMuleOutput({ muleXml, dataWeave, properties });
    setStep(stepId, "Success");

    addAudit({
      ts: new Date().toISOString(),
      stepName: "Build",
      actionName,
      result: "SUCCESS",
      message:
        "Mule flow + DataWeave + properties generated (demo) and stored in session output.",
    });
  };

  // -------------------------
  // Test step
  // -------------------------
  const runGenerateApiTestCases = async (stepId: string, actionName: string) => {
    setStep(stepId, "Running");
    await new Promise((r) => setTimeout(r, 500));

    if (!oasOutput) {
      setStep(stepId, "Failed");
      addAudit({
        ts: new Date().toISOString(),
        stepName: "Test",
        actionName,
        result: "FAILED",
        message: "No OAS. Run Design step first.",
      });
      return;
    }

    const cases = [
      {
        id: "API-001",
        title: "200 OK - valid account inquiry",
        method: "GET",
        path: "/accounts/12345678?asOfDate=2026-02-22",
        expect: {
          status: 200,
          requiredFields: ["accountNo", "balance", "currency", "status"],
        },
      },
      {
        id: "API-002",
        title: "400 - invalid accountNo format",
        method: "GET",
        path: "/accounts/@@@INVALID",
        expect: { status: 400, bodyContains: { code: "VALIDATION_ERROR" } },
      },
      {
        id: "API-003",
        title: "401 - missing/invalid token",
        method: "GET",
        path: "/accounts/12345678",
        expect: { status: 401 },
      },
      {
        id: "API-004",
        title: "Boundary - asOfDate omitted (optional)",
        method: "GET",
        path: "/accounts/12345678",
        expect: { status: 200 },
      },
    ];

    setApiTestCases({
      generatedFrom: "OAS",
      endpointUnderTest:
        Object.keys(oasOutput?.paths ?? {})[0] ?? "/accounts/{accountNo}",
      cases,
    });

    setStep(stepId, "Success");

    addAudit({
      ts: new Date().toISOString(),
      stepName: "Test",
      actionName,
      result: "SUCCESS",
      message: `Generated ${cases.length} API test cases from OAS.`,
    });
  };

  const runApiTests = async (stepId: string, actionName: string) => {
    setStep(stepId, "Running");
    await new Promise((r) => setTimeout(r, 700));

    if (!apiTestCases?.cases?.length) {
      setStep(stepId, "Failed");
      addAudit({
        ts: new Date().toISOString(),
        stepName: "Test",
        actionName,
        result: "FAILED",
        message: "No API test cases. Run 'Generate API Test Cases' first.",
      });
      return;
    }

    // ✅ 데모: 일부러 1개 실패를 만들어 Auto-judge/Debug로 이어지게 함
    const results = apiTestCases.cases.map((c: any) => {
      if (c.id === "API-001") {
        // 200은 맞는데 required field(status) 누락 → Auto-judge에서 실패하게
        return {
          id: c.id,
          title: c.title,
          observed: {
            status: 200,
            latencyMs: 120,
            body: { accountNo: "12345678", balance: 120000.25, currency: "KRW" }, // status 누락
          },
        };
      }
      if (c.id === "API-002") {
        return {
          id: c.id,
          title: c.title,
          observed: {
            status: 400,
            latencyMs: 55,
            body: { code: "VALIDATION_ERROR" },
          },
        };
      }
      if (c.id === "API-003") {
        return {
          id: c.id,
          title: c.title,
          observed: { status: 401, latencyMs: 45, body: { message: "Unauthorized" } },
        };
      }
      return {
        id: c.id,
        title: c.title,
        observed: { status: 200, latencyMs: 90, body: { ok: true } },
      };
    });

    // Run 결과는 아직 판정 전(=raw execution)
    const report = {
      phase: "EXECUTED",
      executedAt: new Date().toISOString(),
      total: results.length,
      results,
    };

    setTestReport(report);
    setStep(stepId, "Success");

    addAudit({
      ts: new Date().toISOString(),
      stepName: "Test",
      actionName,
      result: "SUCCESS",
      message: `Executed ${results.length} API tests (mock). Ready for Auto-Judge.`,
    });
  };

  const runAutoJudge = async (stepId: string, actionName: string) => {
    setStep(stepId, "Running");
    await new Promise((r) => setTimeout(r, 400));

    if (!testReport?.results?.length) {
      setStep(stepId, "Failed");
      addAudit({
        ts: new Date().toISOString(),
        stepName: "Test",
        actionName,
        result: "FAILED",
        message: "No test execution results. Run 'Run API Tests' first.",
      });
      return;
    }

    const judged = testReport.results.map((r: any) => {
      const exp = apiTestCases.cases.find((c: any) => c.id === r.id)?.expect;

      const assertions: any[] = [];
      let passed = true;

      if (exp?.status != null) {
        const ok = r.observed.status === exp.status;
        assertions.push({
          name: `status == ${exp.status}`,
          ok,
          evidence: `observed=${r.observed.status}`,
        });
        if (!ok) passed = false;
      }

      if (exp?.requiredFields?.length) {
        for (const f of exp.requiredFields) {
          const ok =
            r.observed.body &&
            Object.prototype.hasOwnProperty.call(r.observed.body, f);
          assertions.push({
            name: `required field: ${f}`,
            ok,
            evidence: ok ? "present" : "missing",
          });
          if (!ok) passed = false;
        }
      }

      if (exp?.bodyContains) {
        for (const k of Object.keys(exp.bodyContains)) {
          const ok = r.observed.body?.[k] === exp.bodyContains[k];
          assertions.push({
            name: `body.${k} == ${exp.bodyContains[k]}`,
            ok,
            evidence: `observed=${r.observed.body?.[k]}`,
          });
          if (!ok) passed = false;
        }
      }

      return {
        ...r,
        passed,
        assertions,
        rootCauseHint: passed
          ? null
          : r.id === "API-001"
          ? "DataWeave mapping/response builder is missing required field 'status'."
          : "Check API implementation / error model mapping.",
      };
    });

    const failed = judged.filter((x: any) => !x.passed).length;
    const passRate = Math.round(((judged.length - failed) / judged.length) * 100);

    const finalReport = {
      phase: "JUDGED",
      judgedAt: new Date().toISOString(),
      summary: {
        total: judged.length,
        passed: judged.length - failed,
        failed,
        passRate,
      },
      results: judged,
      rules: ["status code", "required fields", "body contains (basic)"],
    };

    setTestReport(finalReport);
    setStep(stepId, failed > 0 ? "Failed" : "Success");

    addAudit({
      ts: new Date().toISOString(),
      stepName: "Test",
      actionName,
      result: failed > 0 ? "FAILED" : "SUCCESS",
      message: `Auto-judge complete. PassRate=${passRate}% (Failed=${failed}).`,
    });
  };

  // -------------------------
  // Workspace file helpers
  // -------------------------
  const simpleLineDiff = (oldStr: string, newStr: string) => {
    const oldLines = (oldStr ?? "").split("\n");
    const newLines = (newStr ?? "").split("\n");

    const max = Math.max(oldLines.length, newLines.length);
    const out: string[] = [];
    for (let i = 0; i < max; i++) {
      const o = oldLines[i] ?? "";
      const n = newLines[i] ?? "";
      if (o === n) {
        out.push("  " + n);
      } else {
        if (o) out.push("- " + o);
        if (n) out.push("+ " + n);
      }
    }
    return out.join("\n");
  };

  const readFile = async (p: string) => {
    const res = await fetch(`/api/files/read?path=${encodeURIComponent(p)}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "read failed");
    return { exists: true, content: data.content as string };
  };

  const writeFile = async (p: string, content: string) => {
    const res = await fetch("/api/files/write", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filePath: p, content }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "write failed");
    return data;
  };

  const previewDiffForBuildArtifacts = async () => {
    if (!muleOutput) return;

    const targets = [
      { path: "artifacts/mule/mule-app.xml", content: muleOutput.muleXml },
      { path: "artifacts/mule/account-inquiry.dwl", content: muleOutput.dataWeave },
      { path: "artifacts/mule/config.properties", content: muleOutput.properties },
    ];

    const nextDiffs: Record<string, string> = {};

    for (const t of targets) {
      try {
        const current = await readFile(t.path);
        nextDiffs[t.path] = simpleLineDiff(current.content, t.content);
      } catch {
        nextDiffs[t.path] = simpleLineDiff("", t.content);
      }
    }

    setDiffs(nextDiffs);
  };

  const requestSaveBuildArtifacts = () => {
    setPendingSave({ actionName: "Write Build Artifacts to Workspace", risk: "High" });
    setApprovalOpen(true);
  };

  const saveBuildArtifacts = async () => {
    if (!muleOutput) return;

    setSaving(true);
    try {
      const targets = [
        { path: "artifacts/mule/mule-app.xml", content: muleOutput.muleXml },
        { path: "artifacts/mule/account-inquiry.dwl", content: muleOutput.dataWeave },
        { path: "artifacts/mule/config.properties", content: muleOutput.properties },
      ];

      for (const t of targets) {
        await writeFile(t.path, t.content);
      }

      addAudit({
        ts: new Date().toISOString(),
        stepName: "Build",
        actionName: "Write artifacts",
        result: "SUCCESS",
        message: "Artifacts written under artifacts/mule/ (approved).",
      });
    } catch (e: any) {
      addAudit({
        ts: new Date().toISOString(),
        stepName: "Build",
        actionName: "Write artifacts",
        result: "FAILED",
        message: e?.message ?? "Write failed",
      });
    } finally {
      setSaving(false);
    }
  };

  // -------------------------
  // Deploy → Observe → Debug cycle (Prototype)
  // -------------------------
  const runPredeployChecklist = async (stepId: string, actionName: string) => {
    setStep(stepId, "Running");
    await new Promise((r) => setTimeout(r, 400));

    const checklist = {
      env,
      checks: [
        { name: "env vars set", ok: true },
        { name: "auth policy attached", ok: true },
        { name: "connector creds placeholders", ok: true },
        { name: "timeout/retry defaults", ok: true },
      ],
      warnings: [],
    };

    setDeployReport((prev: any) => ({ ...(prev ?? {}), checklist }));

    setStep(stepId, "Success");
    addAudit({
      ts: new Date().toISOString(),
      stepName: "Deploy",
      actionName,
      result: "SUCCESS",
      message: "Pre-deploy checklist complete (demo).",
    });
  };

  const runDeployInstance = async (stepId: string, actionName: string) => {
    setStep(stepId, "Running");
    await new Promise((r) => setTimeout(r, 800));

    // 데모: 실패로 시작해서 Observe/Debug 사이클을 보여주기 좋게
    const failed = true;

    const report = failed
      ? {
          env,
          status: "FAILED",
          releaseId: `rel-${Date.now()}`,
          deployTarget: "CloudHub (mock)",
          error: {
            category: "CONFIG",
            message:
              "Startup failed: missing property legacy.baseUrl OR port conflict on http.port (EADDRINUSE).",
          },
          logsRef: "mock://logs/deploy/rel-xxxx",
          startedAt: new Date().toISOString(),
        }
      : {
          env,
          status: "SUCCESS",
          releaseId: `rel-${Date.now()}`,
          deployTarget: "CloudHub (mock)",
          endpoint: "https://dev.api.example.com/accounts/{accountNo}",
          startedAt: new Date().toISOString(),
        };

    setDeployReport(report);

    setStep(stepId, failed ? "Failed" : "Success");
    addAudit({
      ts: new Date().toISOString(),
      stepName: "Deploy",
      actionName,
      result: failed ? "FAILED" : "SUCCESS",
      message: failed
        ? `Deploy failed: ${report?.error?.message ?? "Unknown error"}`
        : `Deploy success: ${report?.releaseId ?? "N/A"}`,
 });
  };

  const runCollectEvidence = async (stepId: string, actionName: string) => {
    setStep(stepId, "Running");
    await new Promise((r) => setTimeout(r, 600));

    if (!deployReport) {
      setStep(stepId, "Failed");
      addAudit({
        ts: new Date().toISOString(),
        stepName: "Observe",
        actionName,
        result: "FAILED",
        message: "No deploy report. Run Deploy first.",
      });
      return;
    }

    const pack = {
      env,
      releaseId: deployReport.releaseId,
      collectedAt: new Date().toISOString(),
      signals: {
        logs: [
          { ts: Date.now() - 5200, level: "INFO", msg: "Loading config.properties..." },
          { ts: Date.now() - 4800, level: "ERROR", msg: deployReport?.error?.message ?? "Unknown error" },
          { ts: Date.now() - 4500, level: "INFO", msg: "Bootstrap aborted." },
        ],
        metrics: [
          { name: "startup_time_ms", value: 2400 },
          { name: "error_rate", value: 0.12 },
        ],
        traces: [
          { span: "deploy.bootstrap", status: "ERROR", evidence: "config missing or port conflict" },
        ],
      },
      evidenceSummary:
        "Evidence suggests configuration issue (missing legacy.baseUrl) or port binding conflict during startup.",
    };

    setEvidencePack(pack);

    setStep(stepId, "Success");
    addAudit({
      ts: new Date().toISOString(),
      stepName: "Observe",
      actionName,
      result: "SUCCESS",
      message: "Evidence collected (logs/metrics/traces) and summarized.",
    });
  };

  const runTraceDrilldown = async (stepId: string, actionName: string) => {
    setStep(stepId, "Running");
    await new Promise((r) => setTimeout(r, 400));

    if (!evidencePack) {
      setStep(stepId, "Failed");
      addAudit({
        ts: new Date().toISOString(),
        stepName: "Debug",
        actionName,
        result: "FAILED",
        message: "No evidence pack. Run Observe → Collect Evidence first.",
      });
      return;
    }

    const trace = {
      releaseId: evidencePack.releaseId,
      steps: [
        { step: "Load config.properties", ok: true, latencyMs: 30 },
        {
          step: "Init http:listener",
          ok: false,
          latencyMs: 12,
          evidence: "EADDRINUSE on http.port OR missing legacy.baseUrl",
        },
        { step: "App started", ok: false, latencyMs: 0 },
      ],
    };

    setDebugReport((prev: any) => ({ ...(prev ?? {}), trace }));

    setStep(stepId, "Success");
    addAudit({
      ts: new Date().toISOString(),
      stepName: "Debug",
      actionName,
      result: "SUCCESS",
      message: "Trace drilldown ready (demo).",
    });
  };

  const runRcl = async (stepId: string, actionName: string) => {
    setStep(stepId, "Running");
    await new Promise((r) => setTimeout(r, 450));

    if (!evidencePack) {
      setStep(stepId, "Failed");
      addAudit({
        ts: new Date().toISOString(),
        stepName: "Debug",
        actionName,
        result: "FAILED",
        message: "No evidence pack.",
      });
      return;
    }

    const rcl = {
      classification: "CONFIG",
      confidence: 0.78,
      candidates: [
        { cause: "Missing config property legacy.baseUrl", confidence: 0.72 },
        { cause: "Port conflict on http.port (EADDRINUSE)", confidence: 0.55 },
      ],
      recommendedFix:
        "Ensure legacy.baseUrl exists in config.properties and use a free port for http.port.",
    };

    setDebugReport((prev: any) => ({ ...(prev ?? {}), rcl }));

    setStep(stepId, "Success");
    addAudit({
      ts: new Date().toISOString(),
      stepName: "Debug",
      actionName,
      result: "SUCCESS",
      message: "Root cause localized with candidate list and recommended fix.",
    });
  };

  const runApplyPatch = async (stepId: string, actionName: string) => {
    setStep(stepId, "Running");
    await new Promise((r) => setTimeout(r, 600));

    const patched = `# config.properties (Patched)
http.host=0.0.0.0
http.port=8082

legacy.baseUrl=https://legacy.example.com
legacy.timeoutMs=3000
legacy.retry=2
`;

    const patch = {
      files: [
        {
          filePath: "artifacts/mule/config.properties",
          diff: [
            "+ legacy.baseUrl=https://legacy.example.com",
            "+ legacy.timeoutMs=3000",
            "+ legacy.retry=2",
            "~ http.port=8082  # was 8081",
          ].join("\n"),
        },
      ],
      rollback: { supported: true, note: "Demo rollback would restore previous file snapshot." },
    };

    setPatchProposal(patch);

    try {
      await writeFile("artifacts/mule/config.properties", patched);

      // UI에서도 properties가 바뀐 느낌을 주고 싶으면 muleOutput도 업데이트(있을 때만)
      setMuleOutput((prev) => (prev ? { ...prev, properties: patched } : prev));

      setStep(stepId, "Success");
      addAudit({
        ts: new Date().toISOString(),
        stepName: "Debug",
        actionName,
        result: "SUCCESS",
        message: "Patch applied to artifacts/mule/config.properties (approved).",
      });
    } catch (e: any) {
      setStep(stepId, "Failed");
      addAudit({
        ts: new Date().toISOString(),
        stepName: "Debug",
        actionName,
        result: "FAILED",
        message: e?.message ?? "Patch apply failed",
      });
    }
  };

  // -------------------------
  // Action dispatcher
  // -------------------------
  const executeAction = async (stepId: string, stepName: string, action: any) => {
    // Approval gate for [H]
    if (action.requiresApproval) {
      setPendingAction({ stepId, stepName, action });
      setApprovalOpen(true);
      return;
    }

    // Intent
    if (stepName === "Intent" && action.name === "Compile Intent") {
      await runCompileIntent(stepId, action.name);
      return;
    }

    // Design
    if (stepName === "Design" && action.name === "Generate/Update API Spec") {
      await runGenerateOAS(stepId, action.name);
      return;
    }

    // Build
    if (stepName === "Build" && action.name === "Generate Mule App") {
      await runGenerateMule(stepId, action.name);
      return;
    }

    if (stepName === "Build" && action.name === "Generate DataWeave") {
      await runGenerateMule(stepId, action.name);
      return;
    }

    // Test
    if (stepName === "Test" && action.name === "Generate API Test Cases") {
      await runGenerateApiTestCases(stepId, action.name);
      return;
    }

    if (stepName === "Test" && action.name === "Run API Tests") {
      await runApiTests(stepId, action.name);
      return;
    }

    if (stepName === "Test" && action.name === "Auto-Judge") {
      await runAutoJudge(stepId, action.name);
      return;
    }

    // Deploy
    if (stepName === "Deploy" && action.name === "Pre-deploy Checklist") {
      await runPredeployChecklist(stepId, action.name);
      return;
    }

    if (stepName === "Deploy" && action.name === "Deploy Instance") {
      await runDeployInstance(stepId, action.name);
      return;
    }

    // Observe
    if (stepName === "Observe" && action.name === "Collect Evidence") {
      await runCollectEvidence(stepId, action.name);
      return;
    }

    // Debug
    if (stepName === "Debug" && action.name === "Trace Drilldown") {
      await runTraceDrilldown(stepId, action.name);
      return;
    }

    if (stepName === "Debug" && action.name === "Root Cause Localization") {
      await runRcl(stepId, action.name);
      return;
    }

    if (stepName === "Debug" && action.name === "Apply Patch (Commit)") {
      await runApplyPatch(stepId, action.name);
      return;
    }

    // Default behavior (still mock)
    setStep(stepId, "Running");
    await new Promise((r) => setTimeout(r, 300));
    setStep(stepId, "Success");

    addAudit({
      ts: new Date().toISOString(),
      stepName,
      actionName: action.name,
      result: "SUCCESS",
      message: `Executed (mock): ${action.name}`,
    });
  };

  const onApproveExecute = async () => {
    // ✅ Save 요청이 있으면 먼저 처리
    if (pendingSave) {
      setApprovalOpen(false);
      setPendingSave(null);
      await saveBuildArtifacts();
      return;
    }

    // (기존 pendingAction 실행 흐름 유지)
    if (!pendingAction) return;
    const { stepId, stepName, action } = pendingAction;

    setApprovalOpen(false);
    setPendingAction(null);

    await executeAction(stepId, stepName, { ...action, requiresApproval: false });
  };

  return (
    <div className="grid grid-cols-12 gap-6">
      {/* Left: Steps */}
      <div className="col-span-4">
        <div className="bg-white rounded shadow p-4">
          <h4 className="font-semibold mb-3">Plan & Steps</h4>
          <div className="space-y-2">
            {graph.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedStepId(s.id)}
                className={`w-full text-left p-3 rounded border hover:bg-gray-50 ${
                  selectedStepId === s.id ? "border-black" : "border-gray-200"
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className="font-medium">{s.name}</span>
                  <span className="text-xs px-2 py-1 rounded bg-gray-100">
                    {stepStates[s.id] ?? "Pending"}
                  </span>
                </div>
                <div className="text-xs text-gray-500 mt-1">{s.agent}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Audit */}
        <div className="bg-white rounded shadow p-4 mt-6">
          <h4 className="font-semibold mb-3">Audit (latest 20)</h4>
          <div className="space-y-2">
            {audit.length === 0 && (
              <div className="text-sm text-gray-500">No actions executed yet.</div>
            )}
            {audit.map((a, idx) => (
              <div key={idx} className="border rounded p-2">
                <div className="flex justify-between items-center">
                  <div className="text-sm font-medium">
                    {a.stepName} · {a.actionName}
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      a.result === "SUCCESS"
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {a.result}
                  </span>
                </div>
                <div className="text-xs text-gray-500">{a.ts}</div>
                <div className="text-sm text-gray-600 mt-1">{a.message}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right: Step detail */}
      <div className="col-span-8">
        <div className="bg-white rounded shadow p-6">
          <h4 className="font-semibold mb-1">Step Detail: {selectedStep?.name}</h4>
          <p className="text-sm text-gray-600 mb-4">{selectedStep?.description}</p>

          {/* Meaningful input only shown for Intent step */}
          {selectedStep?.name === "Intent" && (
            <div className="mb-5">
              <h5 className="font-semibold mb-2">Requirement Input</h5>
              <textarea
                value={requirement}
                onChange={(e) => setRequirement(e.target.value)}
                className="w-full border rounded p-3 min-h-[120px]"
                placeholder="Describe your integration requirement..."
              />
              <div className="text-xs text-gray-500 mt-1">
                This becomes the structured Intent used by downstream agents.
              </div>
            </div>
          )}

          <h5 className="font-semibold mb-2">Actions</h5>

          <div className="space-y-2">
            {selectedStep?.actions.map((a: any) => (
              <div key={a.id} className="border rounded p-3 flex items-center justify-between">
                <div>
                  <div className="font-medium">{a.name}</div>
                  <div className="text-sm text-gray-600">{a.description}</div>

                  <div className="mt-2 flex gap-2 items-center">
                    {a.tags?.A && <BadgeTag label="[A]" tone="blue" />}
                    {a.tags?.C && <BadgeTag label="[C]" tone="yellow" />}
                    {a.tags?.H && <BadgeTag label="[H]" tone="red" />}
                    <span className="text-xs text-gray-500">Risk: {a.risk}</span>
                  </div>
                </div>

                <button
                  className="px-4 py-2 bg-black text-white rounded"
                  onClick={() => executeAction(selectedStep.id, selectedStep.name, a)}
                >
                  Run
                </button>
              </div>
            ))}
          </div>

          {/* Output Panels */}
          {selectedStep?.name === "Intent" && (
            <div className="mt-6">
              <h5 className="font-semibold mb-2">Intent Output</h5>
              <pre className="bg-gray-50 border rounded p-3 text-xs overflow-auto max-h-[260px]">
                {intentOutput
                  ? JSON.stringify(intentOutput, null, 2)
                  : "No intent output yet. Run 'Compile Intent'."}
              </pre>
            </div>
          )}

          {selectedStep?.name === "Design" && (
            <div className="mt-6">
              <h5 className="font-semibold mb-2">API Spec Output (OAS)</h5>
              <pre className="bg-gray-50 border rounded p-3 text-xs overflow-auto max-h-[320px]">
                {oasOutput
                  ? JSON.stringify(oasOutput, null, 2)
                  : "No API Spec yet. Run 'Generate/Update API Spec'."}
              </pre>
            </div>
          )}

          {selectedStep?.name === "Build" && (
            <div className="mt-6 space-y-4">
              <h5 className="font-semibold">Build Output (Mule Artifacts)</h5>

              <div className="flex gap-2 mb-3">
                <button
                  className="px-3 py-2 rounded border"
                  onClick={previewDiffForBuildArtifacts}
                  disabled={!muleOutput}
                >
                  Preview Diff
                </button>

                <button
                  className="px-3 py-2 rounded bg-black text-white"
                  onClick={requestSaveBuildArtifacts}
                  disabled={!muleOutput || saving}
                >
                  {saving ? "Saving..." : "Save to Workspace (Requires Approval)"}
                </button>
              </div>

              {Object.keys(diffs).length > 0 && (
                <div className="border rounded p-3 bg-gray-50">
                  <div className="font-semibold mb-2">Diff Preview</div>
                  {Object.entries(diffs).map(([p, d]) => (
                    <div key={p} className="mb-3">
                      <div className="text-sm font-medium mb-1">{p}</div>
                      <pre className="text-xs overflow-auto max-h-[160px] border rounded p-2 bg-white">
                        {d}
                      </pre>
                    </div>
                  ))}
                </div>
              )}

              <div>
                <div className="text-sm font-medium mb-1">mule-app.xml</div>
                <pre className="bg-gray-50 border rounded p-3 text-xs overflow-auto max-h-[220px]">
                  {muleOutput?.muleXml ?? "No Mule artifacts yet. Run 'Generate Mule App'."}
                </pre>
              </div>

              <div>
                <div className="text-sm font-medium mb-1">account-inquiry.dwl</div>
                <pre className="bg-gray-50 border rounded p-3 text-xs overflow-auto max-h-[180px]">
                  {muleOutput?.dataWeave ?? "No DataWeave yet. Run 'Generate DataWeave'."}
                </pre>
              </div>

              <div>
                <div className="text-sm font-medium mb-1">config.properties</div>
                <pre className="bg-gray-50 border rounded p-3 text-xs overflow-auto max-h-[160px]">
                  {muleOutput?.properties ?? "No properties yet. Run 'Generate Mule App'."}
                </pre>
              </div>
            </div>
          )}

          {selectedStep?.name === "Test" && (
            <div className="mt-6 space-y-4">
              <h5 className="font-semibold">Test Console</h5>

              <div>
                <div className="text-sm font-medium mb-1">Generated Test Cases</div>
                <pre className="bg-gray-50 border rounded p-3 text-xs overflow-auto max-h-[200px]">
                  {apiTestCases
                    ? JSON.stringify(apiTestCases, null, 2)
                    : "No test cases yet. Run 'Generate API Test Cases'."}
                </pre>
              </div>

              <div>
                <div className="text-sm font-medium mb-1">Test Report</div>
                <pre className="bg-gray-50 border rounded p-3 text-xs overflow-auto max-h-[260px]">
                  {testReport
                    ? JSON.stringify(testReport, null, 2)
                    : "No report yet. Run 'Run API Tests' then 'Auto-Judge'."}
                </pre>
              </div>

              {testReport?.summary && (
                <div className="border rounded p-3">
                  <div className="font-medium">Summary</div>
                  <div className="text-sm text-gray-700 mt-1">
                    Total: {testReport.summary.total} / Passed: {testReport.summary.passed} / Failed:{" "}
                    {testReport.summary.failed} / PassRate: {testReport.summary.passRate}%
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    Failed items include assertions + evidence + rootCauseHint (demo).
                  </div>
                </div>
              )}
            </div>
          )}

          {selectedStep?.name === "Deploy" && (
            <div className="mt-6 space-y-3">
              <h5 className="font-semibold">Deploy Console</h5>
              <pre className="bg-gray-50 border rounded p-3 text-xs overflow-auto max-h-[280px]">
                {deployReport ? JSON.stringify(deployReport, null, 2) : "No deploy report yet. Run Deploy actions."}
              </pre>
              <div className="text-xs text-gray-500">
                Tip: In demo, Deploy Instance intentionally fails to trigger Observe → Debug loop.
              </div>
            </div>
          )}

          {selectedStep?.name === "Observe" && (
            <div className="mt-6 space-y-3">
              <h5 className="font-semibold">Observe Console</h5>
              <pre className="bg-gray-50 border rounded p-3 text-xs overflow-auto max-h-[300px]">
                {evidencePack
                  ? JSON.stringify(evidencePack, null, 2)
                  : "No evidence yet. Run 'Collect Evidence' after Deploy."}
              </pre>
            </div>
          )}

          {selectedStep?.name === "Debug" && (
            <div className="mt-6 space-y-3">
              <h5 className="font-semibold">Debug Console</h5>

              <div>
                <div className="text-sm font-medium mb-1">Debug Report</div>
                <pre className="bg-gray-50 border rounded p-3 text-xs overflow-auto max-h-[220px]">
                  {debugReport ? JSON.stringify(debugReport, null, 2) : "No debug report yet. Run Trace/RCL actions."}
                </pre>
              </div>

              <div>
                <div className="text-sm font-medium mb-1">Patch Proposal</div>
                <pre className="bg-gray-50 border rounded p-3 text-xs overflow-auto max-h-[180px]">
                  {patchProposal
                    ? JSON.stringify(patchProposal, null, 2)
                    : "No patch proposal yet. Run 'Apply Patch (Commit)' (requires approval)."}
                </pre>
              </div>
            </div>
          )}

          <div className="text-xs text-gray-500 mt-4">
            * Next: (optional) auto-chain on failure: Deploy 실패 → Observe 추천 → Debug 추천 → Patch 후 재배포 버튼.
          </div>
        </div>
      </div>

      <ApprovalModal
        open={approvalOpen}
        env={env}
        actionName={pendingSave?.actionName ?? pendingAction?.action?.name ?? ""}
        risk={pendingSave?.risk ?? pendingAction?.action?.risk ?? "Low"}
        onApprove={onApproveExecute}
        onClose={() => {
          setApprovalOpen(false);
          setPendingAction(null);
          setPendingSave(null);
        }}
      />
    </div>
  );
}