import {
  getEnvironment,
  isDevelopment,
  isStaging,
  isProduction,
  isProductionLike,
  getEnvironmentName,
  Environment,
} from './environment.util';

describe('environment.util', () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  describe('getEnvironment', () => {
    it('should return Development when NODE_ENV is "development"', () => {
      process.env.NODE_ENV = 'development';
      expect(getEnvironment()).toBe(Environment.Development);
    });

    it('should return Staging when NODE_ENV is "staging"', () => {
      process.env.NODE_ENV = 'staging';
      expect(getEnvironment()).toBe(Environment.Staging);
    });

    it('should return Production when NODE_ENV is "production"', () => {
      process.env.NODE_ENV = 'production';
      expect(getEnvironment()).toBe(Environment.Production);
    });

    it('should default to Development when NODE_ENV is undefined', () => {
      delete process.env.NODE_ENV;
      expect(getEnvironment()).toBe(Environment.Development);
    });

    it('should default to Development for unknown NODE_ENV values', () => {
      process.env.NODE_ENV = 'test';
      expect(getEnvironment()).toBe(Environment.Development);
    });
  });

  describe('isDevelopment', () => {
    it('should return true when environment is development', () => {
      process.env.NODE_ENV = 'development';
      expect(isDevelopment()).toBe(true);
    });

    it('should return false when environment is production', () => {
      process.env.NODE_ENV = 'production';
      expect(isDevelopment()).toBe(false);
    });
  });

  describe('isStaging', () => {
    it('should return true when environment is staging', () => {
      process.env.NODE_ENV = 'staging';
      expect(isStaging()).toBe(true);
    });

    it('should return false when environment is development', () => {
      process.env.NODE_ENV = 'development';
      expect(isStaging()).toBe(false);
    });
  });

  describe('isProduction', () => {
    it('should return true when environment is production', () => {
      process.env.NODE_ENV = 'production';
      expect(isProduction()).toBe(true);
    });

    it('should return false when environment is staging', () => {
      process.env.NODE_ENV = 'staging';
      expect(isProduction()).toBe(false);
    });
  });

  describe('isProductionLike', () => {
    it('should return true in production', () => {
      process.env.NODE_ENV = 'production';
      expect(isProductionLike()).toBe(true);
    });

    it('should return true in staging', () => {
      process.env.NODE_ENV = 'staging';
      expect(isProductionLike()).toBe(true);
    });

    it('should return false in development', () => {
      process.env.NODE_ENV = 'development';
      expect(isProductionLike()).toBe(false);
    });
  });

  describe('getEnvironmentName', () => {
    it('should return the environment string', () => {
      process.env.NODE_ENV = 'staging';
      expect(getEnvironmentName()).toBe('staging');
    });
  });
});
