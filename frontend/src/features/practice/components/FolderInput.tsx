// Ô chọn thư mục ẩn, đặt bên trong một <label> để bấm vào label là mở hộp chọn thư mục.
// onPick nhận danh sách file đã được chép ra mảng + tên thư mục.
export type PickFolder = (files: File[], name: string) => void;

export function FolderInput({ onPick }: { onPick: PickFolder }) {
  return (
    <input
      type="file"
      hidden
      // @ts-expect-error webkitdirectory không có trong type chuẩn của React
      webkitdirectory=""
      multiple
      onChange={(e) => {
        const list = e.target.files;
        if (list && list.length > 0) {
          // Chép ra mảng TRƯỚC khi reset ô input: FileList là danh sách "sống", reset xong nó rỗng.
          const files = Array.from(list);
          onPick(files, files[0].webkitRelativePath.split("/")[0] ?? "");
        }
        e.target.value = ""; // cho phép chọn lại cùng thư mục
      }}
    />
  );
}
