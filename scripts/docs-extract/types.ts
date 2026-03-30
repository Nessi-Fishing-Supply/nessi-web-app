export interface RequestField {
  name: string;
  type: string;
  required: boolean;
}

export type AccessContext = 'Member' | 'Shop';

export interface ApiEndpoint {
  method: string;
  path: string;
  label: string;
  auth: 'user' | 'admin' | 'none';
  access: AccessContext[];
  permissions?: { feature: string; level: string };
  errorCodes: number[];
  requestFields: RequestField[];
  description: string;
  tags: string[];
  sourceFile?: string;
}

export interface ApiGroup {
  name: string;
  endpoints: ApiEndpoint[];
}

export interface EntityField {
  name: string;
  type: string;
  nullable: boolean;
}

export interface Entity {
  name: string;
  label: string;
  fields: EntityField[];
  badges: string[];
  sourceFile?: string;
}

export interface ErdNode {
  id: string;
  label: string;
  // x/y removed — layout coordinates are computed by the rendering layer
}

export interface ErdEdge {
  from: string;
  to: string;
  label: string;
}

export interface Role {
  slug: string;
  name: string;
  description: string;
  color: string;
  permissions: Record<string, string>;
}

export interface ConfigValue {
  value: string;
  label: string;
  description?: string;
  color?: string;
}

export interface ConfigEnum {
  slug: string;
  name: string;
  description: string;
  source: string;
  values: ConfigValue[];
}

export interface FeatureLink {
  type: 'entity' | 'journey' | 'api-group';
  label: string;
  href: string;
}

export interface Feature {
  slug: string;
  name: string;
  description: string;
  componentCount: number;
  endpointCount: number;
  hookCount: number;
  serviceCount: number;
  entities: string[];
  journeySlugs: string[];
  links: FeatureLink[];
}

export interface LifecycleState {
  id: string;
  label: string;
}

export interface LifecycleTransition {
  from: string;
  to: string;
  label: string;
}

export interface Lifecycle {
  slug: string;
  name: string;
  description: string;
  states: LifecycleState[];
  transitions: LifecycleTransition[];
  source?: 'enum' | 'check_constraint' | 'typescript';
  sourceFile?: string;
}

export interface JourneyNode {
  id: string;
  type: 'entry' | 'step' | 'decision';
  label: string;
  layer?: string;
  status?: string;
  route?: string;
  codeRef?: string;
  notes?: string;
  why?: string;
  ux?: string;
  errorCases?: { condition: string; result: string; httpStatus?: number }[];
  options?: { label: string; to: string }[];
}

export interface JourneyEdge {
  from: string;
  to: string;
  opt?: string;
}

export interface Journey {
  slug: string;
  domain?: string;
  title: string;
  persona: string;
  description: string;
  relatedIssues?: number[];
  nodes: JourneyNode[];
  edges: JourneyEdge[];
}

export interface OnboardingStep {
  id: string;
  label: string;
  description: string;
  required: boolean;
  field: string;
}

export interface SellerPrecondition {
  id: string;
  label: string;
  description: string;
}

export interface RoadmapItem {
  title: string;
  number: number;
  url: string;
  status: string;
  priority: string;
  area: string;
  executor: string;
  feature: string;
  labels: string[];
  state: string;
}

export interface ChangelogEntry {
  title: string;
  number: number;
  url: string;
  mergedAt: string;
  author: string;
  labels: string[];
  area: string;
  type: string;
}

export interface ExtractionMeta {
  extractedAt: string;
  sourceCommit: string;
  sourceRepo: string;
  scriptVersion: string;
  itemCounts: Record<string, number>;
}
