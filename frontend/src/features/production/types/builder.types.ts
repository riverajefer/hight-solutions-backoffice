export interface TemplateBuilderState {
  name: string;
  category: string;
  description: string;
  components: BuilderComponent[];
  activeId: string | null;
  activeType: 'component' | 'step' | 'library-step' | null;
}

export interface BuilderComponent {
  id: string; // Temporarily used for drag and drop
  name: string;
  phase: 'impresion' | 'material' | 'armado' | 'despacho';
  isRequired: boolean;
  order: number;
  steps: BuilderStep[];
}

export interface BuilderStep {
  id: string; // Temporarily used for drag and drop
  stepDefinitionId: string;
  stepType: string;
  name: string;
  order: number;
  isRequired: boolean;
  fieldOverrides?: Record<string, any> | null;
}

export interface DraggedData {
  type: 'component' | 'step' | 'library-step';
  componentId?: string;
  step?: any;
}
