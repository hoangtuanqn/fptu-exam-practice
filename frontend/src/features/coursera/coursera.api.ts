import { http } from "@/shared/api/client";

export const ORDER_LABELS = {
  PENDING: "Chờ xử lý", PROCESSING: "Đang xử lý", COMPLETED: "Hoàn tất", REJECTED: "Từ chối", CANCELLED: "Đã hủy",
} as const;
export type OrderStatus = keyof typeof ORDER_LABELS;
// code optional: older backends do not send it yet
export interface CourseraCourse { id: string; title: string; code?: string | null; url: string | null; isActive: boolean; price?: number }
export interface LookedUpCourse extends CourseraCourse { kind?: "course" | "specialization" }
export interface CourseraOrder {
  id: string; userId: string; courseId: string; courseTitle: string; courseUrl: string;
  email: string; note: string; status: OrderStatus; adminNote: string; createdAt: string; updatedAt: string;
  amount?: number; refundedAt?: string | null;
}
export interface OrderInput { requestKey: string; courseId: string; expectedPrice: number; email: string; password: string; note: string }
export interface CourseInput { title: string; code: string | null; url: string | null; isActive: boolean; price: number }

export const courseraApi = {
  courses: (q: string, page: number, admin = false, limit?: number) => http.list<CourseraCourse>(`${admin ? "/admin" : ""}/coursera/courses`, { q, page, limit }),
  orders: (page: number, status?: OrderStatus, admin = false) => http.list<CourseraOrder>(`${admin ? "/admin" : ""}/coursera/orders`, { page, status }),
  lookup: (url: string) => http.post<LookedUpCourse>("/coursera/lookup", { url }),
  create: (data: OrderInput) => http.post<CourseraOrder>("/coursera/orders", data),
  cancel: (id: string) => http.post<CourseraOrder>(`/coursera/orders/${id}/cancel`),
  saveCourse: (data: CourseInput, id?: string) => id ? http.put<CourseraCourse>(`/admin/coursera/courses/${id}`, data) : http.post<CourseraCourse>("/admin/coursera/courses", data),
  update: (id: string, expectedStatus: OrderStatus, status: OrderStatus, adminNote: string) => http.patch<CourseraOrder>(`/admin/coursera/orders/${id}`, { expectedStatus, status, adminNote }),
  note: (id: string, adminNote: string) => http.post<CourseraOrder>(`/admin/coursera/orders/${id}/note`, { adminNote }),
  credentials: (id: string) => http.post<{ email: string; password: string }>(`/admin/coursera/orders/${id}/credentials`),
};
