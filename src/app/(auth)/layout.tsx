import { RouteMessages } from "@/components/providers/route-messages";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RouteMessages>
      <div className="min-h-screen flex items-center justify-center -mt-16">
        {children}
      </div>
    </RouteMessages>
  );
}
