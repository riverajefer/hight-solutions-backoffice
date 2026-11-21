import { diffOrderItemForWorkOrder } from './order-item-work-order-sync.util';

const current = {
  id: 'oi-1',
  description: 'TERMO',
  productionAreas: [{ productionAreaId: 'a1' }, { productionAreaId: 'a2' }],
};

describe('diffOrderItemForWorkOrder', () => {
  it('devuelve null si no cambió nada que la OT copie', () => {
    expect(
      diffOrderItemForWorkOrder(current, {
        description: 'TERMO',
        productionAreaIds: ['a2', 'a1'],
      }),
    ).toBeNull();
  });

  it('lleva la descripción nueva cuando cambia', () => {
    expect(
      diffOrderItemForWorkOrder(current, {
        description: 'TERMO METÁLICO 500 ML',
        productionAreaIds: ['a1', 'a2'],
      }),
    ).toEqual({
      orderItemId: 'oi-1',
      description: 'TERMO METÁLICO 500 ML',
      addedAreaIds: [],
      removedAreaIds: [],
    });
  });

  it('calcula las áreas agregadas y quitadas sin tocar la descripción', () => {
    const change = diffOrderItemForWorkOrder(current, {
      description: 'TERMO',
      productionAreaIds: ['a2', 'a3'],
    });
    expect(change).toEqual({
      orderItemId: 'oi-1',
      addedAreaIds: ['a3'],
      removedAreaIds: ['a1'],
    });
    expect(change).not.toHaveProperty('description');
  });

  it('no toca las áreas si la edición no las trae', () => {
    expect(
      diffOrderItemForWorkOrder(current, { description: 'TERMO' }),
    ).toBeNull();
  });
});
