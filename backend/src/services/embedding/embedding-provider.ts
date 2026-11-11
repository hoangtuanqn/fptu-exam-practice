/**
 * Nguồn tạo vector cho câu hỏi. Câu hỏi trong hệ thống là ẢNH (không có chữ), nên đầu vào là cả câu chứ không chỉ một chuỗi:
 * nguồn nào dùng được dữ liệu nào thì đọc phần đó (dấu vân tay ảnh, hoặc chữ khi sau này có OCR).
 * Trả về null cho câu mà nguồn không tạo được vector (vd chưa có dấu vân tay); câu đó được bỏ qua và đếm lại, không báo lỗi.
 */
export interface EmbeddingInput {
  id: number; // ExamQuestion.id
  text: string | null; // chưa có chữ của câu hỏi (ảnh), để dành cho nguồn OCR/văn bản
  imageHash: Uint8Array | null; // dấu vân tay vùng chữ 1536 bit (utils/question-hash)
}

export interface EmbeddingProvider {
  readonly modelName: string; // lưu vào question_embeddings.model_name; đổi cách tạo vector thì phải đổi tên
  readonly dimensions: number;
  embed(inputs: readonly EmbeddingInput[]): Promise<(Float32Array | null)[]>; // cùng thứ tự với inputs, vector đã chuẩn hoá độ dài 1
}
