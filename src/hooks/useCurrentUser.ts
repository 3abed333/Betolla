import { useQuery } from "@tanstack/react-query";

export type CurrentUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: "CUSTOMER" | "STAFF" | "DELIVERY" | "ADMIN";
} | null;

export function useCurrentUser() {
  return useQuery({
    queryKey: ["currentUser"],
    queryFn: async (): Promise<CurrentUser> => {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      return data.user;
    },
  });
}
