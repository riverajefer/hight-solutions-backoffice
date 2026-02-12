/**
 * Environment Utility
 *
 * Provides helper functions to detect and work with different environments
 * (development, staging, production).
 *
 * Usage:
 *   import { isDevelopment, isProduction, getEnvironment } from '@common/utils/environment.util';
 *
 *   if (isDevelopment()) {
 *     console.log('Running in development mode');
 *   }
 */

export enum Environment {
  Development = 'development',
  Staging = 'staging',
  Production = 'production',
}

/**
 * Get the current environment from NODE_ENV
 * Defaults to 'development' if NODE_ENV is not set
 */
export function getEnvironment(): Environment {
  const env = process.env.NODE_ENV?.toLowerCase();

  switch (env) {
    case 'production':
      return Environment.Production;
    case 'staging':
      return Environment.Staging;
    case 'development':
    default:
      return Environment.Development;
  }
}

/**
 * Check if the current environment is development
 */
export function isDevelopment(): boolean {
  return getEnvironment() === Environment.Development;
}

/**
 * Check if the current environment is staging
 */
export function isStaging(): boolean {
  return getEnvironment() === Environment.Staging;
}

/**
 * Check if the current environment is production
 */
export function isProduction(): boolean {
  return getEnvironment() === Environment.Production;
}

/**
 * Check if the current environment is production or staging
 * Useful for features that should be disabled in development only
 */
export function isProductionLike(): boolean {
  return isProduction() || isStaging();
}

/**
 * Get environment name as string
 */
export function getEnvironmentName(): string {
  return getEnvironment();
}
