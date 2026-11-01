"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/auth/password-input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { toast } from "sonner";
import { analyticsAuth } from "@/lib/analytics";
import Link from "next/link";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

interface LoginFormProps {
  callbackUrl?: string;
}

export function LoginForm({ callbackUrl = "/" }: LoginFormProps) {
  const t = useTranslations("auth");
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(data: LoginFormValues) {
    setIsLoading(true);
    let succeeded = false;

    try {
      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (result?.error) {
        analyticsAuth.loginFailed("credentials");
        toast.error(t("invalidCredentials"));
        return;
      }

      analyticsAuth.login("credentials");
      toast.success(t("loginSuccess"));
      // 整页跳转：router.push 后紧跟 refresh 会被刷新当前页打断，停在登录页
      succeeded = true;
      window.location.assign(callbackUrl);
    } catch {
      toast.error(t("invalidCredentials"));
    } finally {
      if (!succeeded) setIsLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem className="space-y-1">
              <FormLabel className="text-xs">{t("email")}</FormLabel>
              <FormControl>
                <Input type="email" placeholder="name@example.com" className="h-8 text-sm" disabled={isLoading} {...field} />
              </FormControl>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem className="space-y-1">
              <FormLabel className="text-xs">{t("password")}</FormLabel>
              <FormControl>
                <PasswordInput placeholder="••••••••" autoComplete="current-password" className="h-8 text-sm" disabled={isLoading} {...field} />
              </FormControl>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full h-8 text-sm" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
          {t("login")}
        </Button>
        <Link href="/reset-password" className="block text-center text-xs text-muted-foreground hover:underline">{t("forgotPassword")}</Link>
      </form>
    </Form>
  );
}
