import axiosInstance from './axios';
import type { Company, UpsertCompanyDto } from '../types/company.types';

const BASE_URL = '/company';

export const companyApi = {
  /**
   * Obtiene la información de la compañía
   */
  get: async (): Promise<Company | null> => {
    const { data } = await axiosInstance.get<Company | null>(BASE_URL);
    return data;
  },

  /**
   * Crea o actualiza la información de la compañía
   */
  upsert: async (dto: UpsertCompanyDto): Promise<Company> => {
    const { data } = await axiosInstance.put<Company>(BASE_URL, dto);
    return data;
  },
};
