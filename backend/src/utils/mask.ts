// "nguyenvan@gmail.com" -> "ngu***@gmail.com": hiện người được giới thiệu nhưng không lộ email đầy đủ
export const maskEmail = (email: string) => {
  const [name = "", domain = ""] = email.split("@");
  return `${name.slice(0, Math.min(3, Math.max(1, name.length - 1)))}***@${domain}`;
};
