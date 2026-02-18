import axiosInstance from './axios';
import type {
  Order,
  OrdersListResponse,
  CreateOrderDto,
  UpdateOrderDto,
  FilterOrdersDto,
  CreatePaymentDto,
  Payment,
  OrderStatus,
  ApplyDiscountDto,
  OrderDiscount,
} from '../types/order.types';

const BASE_URL = '/orders';

export const ordersApi = {
  /**
   * Obtener todas las órdenes con filtros y paginación
   */
  getAll: async (params?: FilterOrdersDto): Promise<OrdersListResponse> => {
    const { data } = await axiosInstance.get<OrdersListResponse>(BASE_URL, {
      params,
    });
    return data;
  },

  /**
   * Obtener una orden por ID
   */
  getById: async (id: string): Promise<Order> => {
    const { data } = await axiosInstance.get<Order>(`${BASE_URL}/${id}`);
    return data;
  },

  /**
   * Crear nueva orden
   */
  create: async (createOrderDto: CreateOrderDto): Promise<Order> => {
    const { data } = await axiosInstance.post<Order>(BASE_URL, createOrderDto);
    return data;
  },

  /**
   * Actualizar orden (solo DRAFT)
   */
  update: async (id: string, updateOrderDto: UpdateOrderDto): Promise<Order> => {
    const { data } = await axiosInstance.put<Order>(
      `${BASE_URL}/${id}`,
      updateOrderDto
    );
    return data;
  },

  /**
   * Cambiar estado de la orden
   */
  updateStatus: async (id: string, status: OrderStatus): Promise<Order> => {
    const { data } = await axiosInstance.put<Order>(`${BASE_URL}/${id}/status`, {
      status,
    });
    return data;
  },

  /**
   * Eliminar orden (solo DRAFT/CANCELLED)
   */
  delete: async (id: string): Promise<{ message: string }> => {
    const { data } = await axiosInstance.delete<{ message: string }>(
      `${BASE_URL}/${id}`
    );
    return data;
  },

  /**
   * Agregar pago a una orden (solo CONFIRMED+)
   */
  addPayment: async (
    orderId: string,
    createPaymentDto: CreatePaymentDto
  ): Promise<Payment> => {
    const { data } = await axiosInstance.post<Payment>(
      `${BASE_URL}/${orderId}/payments`,
      createPaymentDto
    );
    return data;
  },

  /**
   * Obtener todos los pagos de una orden
   */
  getPayments: async (orderId: string): Promise<Payment[]> => {
    const { data } = await axiosInstance.get<Payment[]>(
      `${BASE_URL}/${orderId}/payments`
    );
    return data;
  },

  /**
   * Subir comprobante de pago
   */
  uploadPaymentReceipt: async (
    orderId: string,
    paymentId: string,
    file: File
  ): Promise<{ message: string; file: any }> => {
    const formData = new FormData();
    formData.append('file', file);

    const { data } = await axiosInstance.post(
      `${BASE_URL}/${orderId}/payments/${paymentId}/receipt`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return data;
  },

  /**
   * Eliminar comprobante de pago
   */
  deletePaymentReceipt: async (
    orderId: string,
    paymentId: string
  ): Promise<{ message: string }> => {
    const { data} = await axiosInstance.delete(
      `${BASE_URL}/${orderId}/payments/${paymentId}/receipt`
    );
    return data;
  },

  /**
   * Aplicar descuento a una orden (solo CONFIRMED+)
   */
  applyDiscount: async (
    orderId: string,
    applyDiscountDto: ApplyDiscountDto
  ): Promise<OrderDiscount> => {
    const { data } = await axiosInstance.post<OrderDiscount>(
      `${BASE_URL}/${orderId}/discounts`,
      applyDiscountDto
    );
    return data;
  },

  /**
   * Obtener todos los descuentos de una orden
   */
  getDiscounts: async (orderId: string): Promise<OrderDiscount[]> => {
    const { data } = await axiosInstance.get<OrderDiscount[]>(
      `${BASE_URL}/${orderId}/discounts`
    );
    return data;
  },

  /**
   * Eliminar un descuento de una orden (admin only)
   */
  removeDiscount: async (
    orderId: string,
    discountId: string
  ): Promise<Order> => {
    const { data } = await axiosInstance.delete<Order>(
      `${BASE_URL}/${orderId}/discounts/${discountId}`
    );
    return data;
  },

  /**
   * Registrar número de factura electrónica (solo si tiene IVA y no está en DRAFT)
   */
  registerElectronicInvoice: async (
    orderId: string,
    electronicInvoiceNumber: string
  ): Promise<Order> => {
    const { data } = await axiosInstance.patch<Order>(
      `${BASE_URL}/${orderId}/electronic-invoice`,
      { electronicInvoiceNumber }
    );
    return data;
  },
};
