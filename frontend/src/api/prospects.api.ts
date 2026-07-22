import axios from './axios';
import {
  ConvertProspectDto,
  CreateProspectContactDto,
  CreateProspectDto,
  FilterProspectsDto,
  Prospect,
  ProspectContact,
  ProspectMetrics,
  ProspectMetricsFilterDto,
  UpdateProspectDto,
} from '../types/prospect.types';
import { ApiResponse, PaginatedMetaResponse } from '../types/api.types';

export const prospectsApi = {
  findAll: async (params?: FilterProspectsDto) => {
    const { data } = await axios.get<PaginatedMetaResponse<Prospect>>('/prospects', {
      params,
    });
    return data;
  },

  findOne: async (id: string) => {
    const { data } = await axios.get<Prospect>(`/prospects/${id}`);
    return data;
  },

  create: async (prospect: CreateProspectDto) => {
    const { data } = await axios.post<Prospect>('/prospects', prospect);
    return data;
  },

  update: async (id: string, prospect: UpdateProspectDto) => {
    const { data } = await axios.patch<Prospect>(`/prospects/${id}`, prospect);
    return data;
  },

  delete: async (id: string) => {
    const { data } = await axios.delete<ApiResponse<null>>(`/prospects/${id}`);
    return data;
  },

  addContact: async (id: string, contact: CreateProspectContactDto) => {
    const { data } = await axios.post<ProspectContact>(
      `/prospects/${id}/contacts`,
      contact,
    );
    return data;
  },

  deleteContact: async (id: string, contactId: string) => {
    const { data } = await axios.delete<ApiResponse<null>>(
      `/prospects/${id}/contacts/${contactId}`,
    );
    return data;
  },

  convert: async (id: string, dto: ConvertProspectDto) => {
    const { data } = await axios.post<{ prospect: Prospect; target: string }>(
      `/prospects/${id}/convert`,
      dto,
    );
    return data;
  },

  getMetrics: async (params?: ProspectMetricsFilterDto) => {
    const { data } = await axios.get<ProspectMetrics>('/prospects/metrics', {
      params,
    });
    return data;
  },
};
