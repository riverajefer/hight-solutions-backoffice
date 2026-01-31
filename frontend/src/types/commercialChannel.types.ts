export interface CommercialChannel {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCommercialChannelDto {
  name: string;
  description?: string;
}

export interface UpdateCommercialChannelDto {
  name?: string;
  description?: string;
}
