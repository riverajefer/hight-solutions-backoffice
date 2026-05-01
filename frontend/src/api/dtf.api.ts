import axiosInstance from './axios';
import type {
  DtfRecord,
  DtfListResponse,
  DtfListFilters,
  BulkCreateDtfDto,
  UpdateDtfRecordDto,
  ChangeDtfStatusDto,
  DtfFiles,
  DtfStatusHistoryEntry,
} from '../types/dtf.types';

const BASE_URL = '/dtf';

export const dtfApi = {
  getAll: async (filters?: DtfListFilters): Promise<DtfListResponse> => {
    const { data } = await axiosInstance.get<DtfListResponse>(BASE_URL, {
      params: filters,
    });
    return data;
  },

  getById: async (id: string): Promise<DtfRecord> => {
    const { data } = await axiosInstance.get<DtfRecord>(`${BASE_URL}/${id}`);
    return data;
  },

  bulkCreate: async (dto: BulkCreateDtfDto): Promise<DtfRecord[]> => {
    const { data } = await axiosInstance.post<DtfRecord[]>(`${BASE_URL}/bulk`, dto);
    return data;
  },

  update: async (id: string, dto: UpdateDtfRecordDto): Promise<DtfRecord> => {
    const { data } = await axiosInstance.put<DtfRecord>(`${BASE_URL}/${id}`, dto);
    return data;
  },

  changeStatus: async (id: string, dto: ChangeDtfStatusDto): Promise<DtfRecord> => {
    const { data } = await axiosInstance.put<DtfRecord>(`${BASE_URL}/${id}/status`, dto);
    return data;
  },

  convertToOrder: async (id: string): Promise<{ id: string; orderNumber: string }> => {
    const { data } = await axiosInstance.post(`${BASE_URL}/${id}/convert-to-order`);
    return data;
  },

  uploadImage: async (id: string, file: File): Promise<DtfFiles['images'][0]> => {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await axiosInstance.patch(`${BASE_URL}/${id}/image`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  uploadComprobante: async (id: string, file: File): Promise<DtfFiles['comprobantes'][0]> => {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await axiosInstance.patch(`${BASE_URL}/${id}/comprobante`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  getFiles: async (id: string): Promise<DtfFiles> => {
    const { data } = await axiosInstance.get<DtfFiles>(`${BASE_URL}/${id}/files`);
    return data;
  },

  getStatusHistory: async (id: string): Promise<DtfStatusHistoryEntry[]> => {
    const { data } = await axiosInstance.get<DtfStatusHistoryEntry[]>(
      `${BASE_URL}/${id}/status-history`,
    );
    return data;
  },
};
