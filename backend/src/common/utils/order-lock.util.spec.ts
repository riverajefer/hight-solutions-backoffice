import { lockOrderForUpdate } from './order-lock.util';

describe('lockOrderForUpdate', () => {
  it('bloquea la fila de la OP con FOR UPDATE y el id como parámetro', async () => {
    const tx = { $queryRaw: jest.fn().mockResolvedValue([]) };

    await lockOrderForUpdate(tx as any, 'order-1');

    const [strings, ...values] = tx.$queryRaw.mock.calls[0];
    expect(strings.join('?')).toBe('SELECT id FROM orders WHERE id = ? FOR UPDATE');
    // El id viaja como parámetro, nunca concatenado en el SQL.
    expect(values).toEqual(['order-1']);
  });
});
