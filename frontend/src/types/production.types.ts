export type StepType =
  | 'PAPEL'
  | 'PLANCHAS'
  | 'CARTON'
  | 'MUESTRA_COLOR'
  | 'PLASTIFICADO'
  | 'CORTE'
  | 'TROQUEL'
  | 'REVISION'
  | 'ARMADO'
  | 'EMPAQUE';

export type ComponentPhase = 'impresion' | 'material' | 'armado' | 'despacho';

export type ProductionOrderStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export type ProductionStepStatus =
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'SKIPPED'
  | 'BLOCKED';

export type FieldType =
  | 'text'
  | 'number'
  | 'boolean'
  | 'select'
  | 'textarea'
  | 'date'
  | 'datetime'
  | 'supplier'
  | 'client'
  | 'material'
  | 'measurement'
  | 'quantity';

export interface FieldValidation {
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
}

export interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  stage: 'specification' | 'execution';
  required: boolean;
  order?: number;
  placeholder?: string;
  defaultValue?: any;
  options?: string[];
  validation?: FieldValidation;
}

export interface UpdateFieldSchemaPayload {
  fieldSchema: { fields: FieldDef[] };
}

export interface UpdateFieldSchemaResponse {
  id: string;
  type: string;
  name: string;
  description?: string;
  fieldSchema: { fields: FieldDef[] };
  warning?: string;
}

export interface StepDefinition {
  id: string;
  type: StepType;
  name: string;
  description?: string;
  fieldSchema: { fields: FieldDef[] };
}

export interface TemplateComponentStep {
  id: string;
  order: number;
  isRequired: boolean;
  fieldOverrides?: {
    remove?: string[];
    add?: FieldDef[];
    override?: Array<{ key: string; label?: string }>;
  };
  stepDefinition: StepDefinition;
}

export interface TemplateComponent {
  id: string;
  name: string;
  order: number;
  phase: ComponentPhase;
  isRequired: boolean;
  steps: TemplateComponentStep[];
}

export interface ProductTemplate {
  id: string;
  name: string;
  category: string;
  description?: string;
  isActive: boolean;
  components: TemplateComponent[];
  createdAt: string;
  updatedAt: string;
  _count?: { components: number };
}

export interface ProductTemplateSummary {
  id: string;
  name: string;
  category: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count: { components: number };
}

export interface ProductionOrderStep {
  id: string;
  order: number;
  status: ProductionStepStatus;
  fieldValues: {
    specification: Record<string, any>;
    execution: Record<string, any>;
  };
  stepDefinition: Pick<StepDefinition, 'id' | 'type' | 'name' | 'fieldSchema'>;
  fieldOverrides?: TemplateComponentStep['fieldOverrides'];
  completedAt?: string;
  completedBy?: { id: string; firstName: string; lastName: string };
  notes?: string;
}

export interface ProductionOrderComponent {
  id: string;
  name: string;
  order: number;
  phase: ComponentPhase;
  progress: number;
  steps: ProductionOrderStep[];
}

export interface ProductionOrder {
  id: string;
  oprodNumber: string;
  status: ProductionOrderStatus;
  notes?: string;
  template: { id: string; name: string; category: string };
  workOrder?: { id: string; workOrderNumber: string };
  createdBy?: { id: string; firstName: string; lastName: string };
  progress: { total: number; completedSteps: number; totalSteps: number };
  components: ProductionOrderComponent[];
  createdAt: string;
  updatedAt: string;
}

export interface ProductionOrderSummary {
  id: string;
  oprodNumber: string;
  status: ProductionOrderStatus;
  notes?: string;
  template: { id: string; name: string; category: string };
  workOrder?: { id: string; workOrderNumber: string };
  createdBy?: { id: string; firstName: string; lastName: string };
  createdAt: string;
  _count: { components: number };
}

export interface ProductionOrdersResponse {
  data: ProductionOrderSummary[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

/** Resolves the effective field list for a step, applying fieldOverrides */
export function resolveEffectiveFields(step: ProductionOrderStep): FieldDef[] {
  const base: FieldDef[] = step.stepDefinition.fieldSchema?.fields ?? [];
  if (!step.fieldOverrides) return base;

  const { remove = [], add = [], override = [] } = step.fieldOverrides;

  let fields = base.filter((f) => !remove.includes(f.key));

  // Apply label overrides
  fields = fields.map((f) => {
    const ov = override.find((o) => o.key === f.key);
    return ov ? { ...f, ...ov } : f;
  });

  return [...fields, ...add];
}
