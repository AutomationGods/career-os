import { redirect } from "next/navigation";
import { auth } from "../../auth";

export type PageUser = {
  id: string;
  email?: string | null;
  name?: string | null;
  role: string;
};

export async function requirePageUser(): Promise<PageUser> {
  const session = await auth();
  const user = session?.user as { id?: string; email?: string | null; name?: string | null; role?: string } | undefined;
  if (!user?.id) redirect("/api/auth/signin");

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role ?? "user"
  };
}
