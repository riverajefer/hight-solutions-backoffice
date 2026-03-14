export interface Company {
  id: string;
  name: string;
  logoLightId?: string | null;
  logoDarkId?: string | null;
  logoLightUrl?: string | null;
  logoDarkUrl?: string | null;
  description?: string | null;
  phone?: string | null;
  mobilePhone?: string | null;
  email?: string | null;
  website?: string | null;
  address?: string | null;
  nit?: string | null;
  legalRepresentative?: string | null;
  foundedYear?: number | null;
  taxRegime?: string | null;
  bankName?: string | null;
  bankAccountNumber?: string | null;
  bankAccountType?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertCompanyDto {
  name: string;
  logoLightId?: string | null;
  logoDarkId?: string | null;
  description?: string | null;
  phone?: string | null;
  mobilePhone?: string | null;
  email?: string | null;
  website?: string | null;
  address?: string | null;
  nit?: string | null;
  legalRepresentative?: string | null;
  foundedYear?: number | null;
  taxRegime?: string | null;
  bankName?: string | null;
  bankAccountNumber?: string | null;
  bankAccountType?: string | null;
}
