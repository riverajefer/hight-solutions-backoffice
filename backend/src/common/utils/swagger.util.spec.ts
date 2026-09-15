import { isSwaggerEnabled } from './swagger.util';

describe('isSwaggerEnabled', () => {
  it('se publica en desarrollo', () => {
    expect(isSwaggerEnabled({ NODE_ENV: 'development' })).toBe(true);
  });

  it('sin NODE_ENV se comporta como desarrollo', () => {
    expect(isSwaggerEnabled({})).toBe(true);
  });

  // El API de estos ambientes está en internet: Swagger publicaría su mapa.
  it.each(['production', 'staging'])('no se publica en %s', (nodeEnv) => {
    expect(isSwaggerEnabled({ NODE_ENV: nodeEnv })).toBe(false);
  });

  it('SWAGGER_ENABLED=true lo habilita fuera de desarrollo', () => {
    expect(isSwaggerEnabled({ NODE_ENV: 'staging', SWAGGER_ENABLED: 'true' })).toBe(true);
  });

  it('cualquier otro valor de SWAGGER_ENABLED no lo habilita en producción', () => {
    expect(isSwaggerEnabled({ NODE_ENV: 'production', SWAGGER_ENABLED: 'false' })).toBe(false);
    expect(isSwaggerEnabled({ NODE_ENV: 'production', SWAGGER_ENABLED: '1' })).toBe(false);
  });
});
