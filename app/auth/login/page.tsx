import { LoginForm } from "@/components/login-form";
import { safeInternalPath } from "@/lib/security/redirects";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <LoginForm nextPath={safeInternalPath(params.next)} />
      </div>
    </div>
  );
}
