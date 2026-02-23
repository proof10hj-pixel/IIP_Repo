// src/lib/seed.ts
// Minimal seed graph for Orchestrator UI (PRD-aligned)

import { v4 as uuid } from "uuid";

export type Env = "DEV" | "STG" | "PRD";
export type StepName = "Intent" | "Design" | "Build" | "Test" | "Deploy" | "Observe" | "Debug";
export type StepState = "Pending" | "Running" | "Success" | "Failed" | "Skipped";
export type AgentType = "Orchestrator" | "Intent" | "Design" | "Dev" | "Test" | "Deploy" | "Debug";

export type Risk = "Low" | "Medium" | "High";
export type ActionTags = { A: boolean; C: boolean; H: boolean };

export interface ActionItem {
  id: string;
  name: string;
  description: string;
  tags: ActionTags;              // [A]/[C]/[H]
  risk: Risk;
  requiresApproval: boolean;     // true when [H]
  frRefs: string[];              // FR mapping (optional but useful)
  apiEndpoint: string;           // mock endpoint (optional)
  payloadTemplate: any;
}

export interface Step {
  id: string;
  name: StepName;
  state: StepState;
  agent: AgentType;
  description: string;
  actions: ActionItem[];
}

const A = (
  risk: Risk,
  frRefs: string[],
  name: string,
  description: string,
  apiEndpoint: string,
  payloadTemplate: any
): ActionItem => ({
  id: uuid(),
  name,
  description,
  tags: { A: true, C: false, H: false },
  risk,
  requiresApproval: false,
  frRefs,
  apiEndpoint,
  payloadTemplate,
});

const C = (risk: Risk, frRefs: string[], name: string, description: string): ActionItem => ({
  id: uuid(),
  name,
  description,
  tags: { A: false, C: true, H: false },
  risk,
  requiresApproval: false,
  frRefs,
  apiEndpoint: "",
  payloadTemplate: null,
});

const AH = (
  risk: Risk,
  frRefs: string[],
  name: string,
  description: string,
  apiEndpoint: string,
  payloadTemplate: any
): ActionItem => ({
  id: uuid(),
  name,
  description,
  tags: { A: true, C: false, H: true },
  risk,
  requiresApproval: true,
  frRefs,
  apiEndpoint,
  payloadTemplate,
});

export function createSessionGraph(env: Env): Step[] {
  const isPRD = env === "PRD";

  return [
    {
      id: uuid(),
      name: "Intent",
      state: "Pending",
      agent: "Intent",
      description: "Compile natural language requirements into structured intent and constraints.",
      actions: [
        A("Low", ["FR-003"], "Compile Intent", "Parse requirement into intent + plan outline.", "/api/actions/intent/compile", {
          env,
        }),
        C("Low", ["FR-006"], "Show Assumptions", "Explain assumptions and missing inputs."),
      ],
    },
    {
      id: uuid(),
      name: "Design",
      state: "Pending",
      agent: "Design",
      description: "Generate/update API Spec (OAS/RAML) and apply org guardrails.",
      actions: [
        AH("High", ["FR-101", "FR-103"], "Generate/Update API Spec", "Create or update OAS/RAML. Requires approval.", "/api/actions/design/spec-generate", {
          specType: "OAS",
          env,
        }),
        C("Low", ["FR-102"], "Spec Quality Review", "Suggest improvements: naming, schema, error model."),
      ],
    },
    {
      id: uuid(),
      name: "Build",
      state: "Pending",
      agent: "Dev",
      description: "Generate Mule app skeleton and DataWeave transforms.",
      actions: [
        AH("High", ["FR-201"], "Generate Mule App", "Create flows/connectors/config placeholders. Requires approval.", "/api/actions/dev/generate-app", { env }),
        AH("High", ["FR-205"], "Generate DataWeave", "Create DW scripts and validate with sample input. Requires approval.", "/api/actions/dev/dataweave", { env }),
        C("Low", ["FR-204"], "Codebase Q&A", "Explain flow/data mapping and risks."),
      ],
    },
    {
      id: uuid(),
      name: "Test",
      state: "Pending",
      agent: "Test",
      description: "Generate/run API tests and E2E workflow tests, auto-judge results.",
      actions: [
        A("Medium", ["FR-601"], "Generate API Test Cases", "Generate normal/boundary/error/auth/smoke tests.", "/api/actions/test/api-generate", { env }),
        AH(isPRD ? "High" : "Medium", ["FR-602"], "Run API Tests", "Execute tests with auth template. Requires approval.", "/api/actions/test/api-run", {
          env,
          requireSecondConfirm: isPRD,
        }),
        A("Medium", ["FR-603"], "Auto-Judge", "Validate status/schema/field rules and compute pass/fail.", "/api/actions/test/auto-judge", { env }),
      ],
    },
    {
      id: uuid(),
      name: "Deploy",
      state: "Pending",
      agent: "Deploy",
      description: "Deploy to environment and record release history.",
      actions: [
        C("Low", ["FR-303"], "Pre-deploy Checklist", "Check env vars/policies/permissions and warn risks."),
        AH("High", ["FR-301"], "Deploy Instance", "Deploy to selected env. Requires approval.", "/api/actions/deploy/deploy", {
          env,
          requireSecondConfirm: isPRD,
        }),
      ],
    },
    {
      id: uuid(),
      name: "Observe",
      state: "Pending",
      agent: "Orchestrator",
      description: "Collect logs/metrics/traces and summarize evidence.",
      actions: [
        A("Low", ["FR-404"], "Collect Evidence", "Gather logs/metrics/traces for evidence-based summary.", "/api/actions/observe/collect", { env }),
        C("Low", ["FR-401"], "Troubleshooting Summary", "Classify cause candidates and propose actions."),
      ],
    },
    {
      id: uuid(),
      name: "Debug",
      state: "Pending",
      agent: "Debug",
      description: "Drill down step traces, localize root cause, propose patch diff and apply with approval.",
      actions: [
        A("Medium", ["FR-621"], "Trace Drilldown", "Show step-level IO + connector req/resp + latency.", "/api/actions/debug/trace", { env }),
        A("Medium", ["FR-623"], "Root Cause Localization", "Localize failure to step/config/data/auth/network.", "/api/actions/debug/rcl", { env }),
        AH("High", ["FR-624"], "Apply Patch (Commit)", "Apply safe patch (DW/config) with rollback option. Requires approval.", "/api/actions/debug/apply-patch", {
          env,
          rollbackEnabled: true,
        }),
      ],
    },
  ];
}