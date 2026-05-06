import axiosInstance from './axios';

interface ApprovalResolveResponse {
  requestType: string;
  entityId: string;
}

export const approvalRedirectApi = {
  resolve: async (requestId: string): Promise<ApprovalResolveResponse> => {
    const { data } = await axiosInstance.get<ApprovalResolveResponse>(
      `/approvals/resolve/${requestId}`,
    );
    return data;
  },
};
