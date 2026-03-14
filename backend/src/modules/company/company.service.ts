import { Injectable } from '@nestjs/common';
import { CompanyRepository } from './company.repository';
import { StorageService } from '../storage/storage.service';
import { UpdateCompanyDto } from './dto';

@Injectable()
export class CompanyService {
  constructor(
    private readonly companyRepository: CompanyRepository,
    private readonly storageService: StorageService,
  ) {}

  /**
   * Obtiene la información de la compañía con URLs firmadas para logos
   */
  async getCompany() {
    const company = await this.companyRepository.findOne();

    if (!company) {
      return null;
    }

    let logoLightUrl: string | undefined;
    let logoDarkUrl: string | undefined;

    if (company.logoLightId) {
      try {
        logoLightUrl = await this.storageService.getFileUrl(company.logoLightId);
      } catch {
        // Si el archivo no existe o fue eliminado, ignorar
      }
    }

    if (company.logoDarkId) {
      try {
        logoDarkUrl = await this.storageService.getFileUrl(company.logoDarkId);
      } catch {
        // Si el archivo no existe o fue eliminado, ignorar
      }
    }

    return {
      ...company,
      logoLightUrl,
      logoDarkUrl,
    };
  }

  /**
   * Crea o actualiza la información de la compañía (upsert)
   */
  async upsertCompany(dto: UpdateCompanyDto) {
    const existing = await this.companyRepository.findOne();

    if (!existing) {
      const created = await this.companyRepository.create({
        name: dto.name ?? '',
        logoLightId: dto.logoLightId,
        logoDarkId: dto.logoDarkId,
        description: dto.description,
        phone: dto.phone,
        mobilePhone: dto.mobilePhone,
        email: dto.email,
        website: dto.website,
        address: dto.address,
        nit: dto.nit,
        legalRepresentative: dto.legalRepresentative,
        foundedYear: dto.foundedYear,
        taxRegime: dto.taxRegime,
        bankName: dto.bankName,
        bankAccountNumber: dto.bankAccountNumber,
        bankAccountType: dto.bankAccountType,
      });

      return this.enrichWithUrls(created);
    }

    const updated = await this.companyRepository.update(existing.id, {
      name: dto.name,
      logoLightId: dto.logoLightId,
      logoDarkId: dto.logoDarkId,
      description: dto.description,
      phone: dto.phone,
      mobilePhone: dto.mobilePhone,
      email: dto.email,
      website: dto.website,
      address: dto.address,
      nit: dto.nit,
      legalRepresentative: dto.legalRepresentative,
      foundedYear: dto.foundedYear,
      taxRegime: dto.taxRegime,
      bankName: dto.bankName,
      bankAccountNumber: dto.bankAccountNumber,
      bankAccountType: dto.bankAccountType,
    });

    return this.enrichWithUrls(updated);
  }

  private async enrichWithUrls(company: {
    id: string;
    name: string;
    logoLightId: string | null;
    logoDarkId: string | null;
    [key: string]: unknown;
  }) {
    let logoLightUrl: string | undefined;
    let logoDarkUrl: string | undefined;

    if (company.logoLightId) {
      try {
        logoLightUrl = await this.storageService.getFileUrl(company.logoLightId);
      } catch {
        // ignorar si el archivo no existe
      }
    }

    if (company.logoDarkId) {
      try {
        logoDarkUrl = await this.storageService.getFileUrl(company.logoDarkId);
      } catch {
        // ignorar si el archivo no existe
      }
    }

    return {
      ...company,
      logoLightUrl,
      logoDarkUrl,
    };
  }
}
