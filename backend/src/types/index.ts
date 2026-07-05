export interface Role {
  USER: "USER";
  MANAGER: "MANAGER";
  ADMIN: "ADMIN";
  SELLER: "SELLER";
}

export interface User {
  id: string;
  email: string;
  role: keyof Role;
}
