import { AuthErrorPanel } from "@/components/auth/AuthErrorPanel";

interface Props {
  searchParams: Promise<{ message?: string }>;
}

export default async function AuthErrorPage({ searchParams }: Props) {
  const { message } = await searchParams;

  return <AuthErrorPanel message={message} />;
}
