import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { TemplateBuilderState, BuilderComponent, BuilderStep } from '../types/builder.types';

interface TemplateBuilderActions {
  setName: (name: string) => void;
  setCategory: (category: string) => void;
  setDescription: (description: string) => void;
  addComponent: () => void;
  removeComponent: (id: string) => void;
  updateComponent: (id: string, updates: Partial<BuilderComponent>) => void;
  reorderComponents: (activeId: string, overId: string) => void;
  addStep: (componentId: string, stepDefinitionId: string, stepType: string, name: string) => void;
  removeStep: (componentId: string, stepId: string) => void;
  reorderSteps: (componentId: string, activeId: string, overId: string) => void;
  moveStep: (fromComponentId: string, toComponentId: string, stepId: string, overId?: string) => void;
  setAllData: (data: Partial<TemplateBuilderState>) => void;
  setActiveId: (activeId: string | null, activeType: 'component' | 'step' | 'library-step' | null) => void;
  reset: () => void;
}

const initialState: TemplateBuilderState = {
  name: '',
  category: 'cuadernos',
  description: '',
  components: [],
  activeId: null,
  activeType: null,
};

export const useTemplateBuilderStore = create<TemplateBuilderState & TemplateBuilderActions>((set) => ({
  ...initialState,

  setName: (name) => set({ name }),
  setCategory: (category) => set({ category }),
  setDescription: (description) => set({ description }),

  addComponent: () => set((state) => ({
    components: [
      ...state.components,
      {
        id: uuidv4(),
        name: `Componente ${state.components.length + 1}`,
        phase: 'impresion',
        isRequired: true,
        order: state.components.length + 1,
        steps: [],
      }
    ]
  })),

  removeComponent: (id) => set((state) => ({
    components: state.components.filter((c) => c.id !== id)
  })),

  updateComponent: (id, updates) => set((state) => ({
    components: state.components.map((c) => 
      c.id === id ? { ...c, ...updates } : c
    )
  })),

  reorderComponents: (activeId, overId) => set((state) => {
    const oldIndex = state.components.findIndex((c) => c.id === activeId);
    const newIndex = state.components.findIndex((c) => c.id === overId);
    if (oldIndex === -1 || newIndex === -1) return state;

    const newComponents = [...state.components];
    const [moved] = newComponents.splice(oldIndex, 1);
    newComponents.splice(newIndex, 0, moved);

    return { 
      components: newComponents.map((c, i) => ({ ...c, order: i + 1 })) 
    };
  }),

  addStep: (componentId, stepDefinitionId, stepType, name) => set((state) => ({
    components: state.components.map((c) => {
      if (c.id === componentId) {
        return {
          ...c,
          steps: [
            ...c.steps,
            {
              id: uuidv4(),
              stepDefinitionId,
              stepType,
              name,
              isRequired: true,
              order: c.steps.length + 1,
            }
          ]
        };
      }
      return c;
    })
  })),

  removeStep: (componentId, stepId) => set((state) => ({
    components: state.components.map((c) => {
      if (c.id === componentId) {
        return {
          ...c,
          steps: c.steps.filter((s) => s.id !== stepId)
        };
      }
      return c;
    })
  })),

  reorderSteps: (componentId, activeId, overId) => set((state) => ({
    components: state.components.map((c) => {
      if (c.id === componentId) {
        const oldIndex = c.steps.findIndex((s) => s.id === activeId);
        const newIndex = c.steps.findIndex((s) => s.id === overId);
        if (oldIndex === -1 || newIndex === -1) return c;

        const newSteps = [...c.steps];
        const [moved] = newSteps.splice(oldIndex, 1);
        newSteps.splice(newIndex, 0, moved);

        return {
          ...c,
          steps: newSteps.map((s, i) => ({ ...s, order: i + 1 }))
        };
      }
      return c;
    })
  })),

  moveStep: (fromComponentId, toComponentId, stepId, overId) => set((state) => {
    let movedStep: BuilderStep | undefined;

    // First remove from the source
    const updatedComponents = state.components.map((c) => {
      if (c.id === fromComponentId) {
        movedStep = c.steps.find((s) => s.id === stepId);
        return { ...c, steps: c.steps.filter((s) => s.id !== stepId) };
      }
      return c;
    });

    if (!movedStep) return state;

    // Then add to the destination
    return {
      components: updatedComponents.map((c) => {
        if (c.id === toComponentId) {
          const newSteps = [...c.steps];
          if (overId) {
            const overIndex = newSteps.findIndex((s) => s.id === overId);
            newSteps.splice(overIndex !== -1 ? overIndex : newSteps.length, 0, movedStep!);
          } else {
            newSteps.push(movedStep!);
          }
          return { ...c, steps: newSteps.map((s, i) => ({ ...s, order: i + 1 })) };
        }
        return c;
      })
    };
  }),

  setAllData: (data) => set((state) => ({ ...state, ...data })),

  setActiveId: (activeId, activeType) => set({ activeId, activeType }),

  reset: () => set(initialState),
}));