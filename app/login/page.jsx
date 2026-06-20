"use client";


import Image from "next/image";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import ButtonPrimary from "../components/ButtonPrimary";

export default function LoginPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  const errorCode = searchParams.get("error");
  const errorMessages = {
    AccessDenied: "Email kamu tidak ada dalam daftar yang diizinkan. Hubungi admin 8EH.",
    OAuthAccountNotLinked: "Email ini sudah terdaftar dengan metode login lain.",
    Signin: "Terjadi kesalahan saat login. Silakan coba lagi.",
    OAuthSignin: "Terjadi kesalahan saat login. Silakan coba lagi.",
    OAuthCallback: "Terjadi kesalahan saat login. Silakan coba lagi.",
  };
  const errorMessage = errorCode
    ? (errorMessages[errorCode] ?? "Terjadi kesalahan. Silakan coba lagi atau hubungi admin.")
    : null;

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/dashboard");
    }
  }, [status, router]);

  if (status === "loading" || status === "authenticated") {
    return (
      <div className="bg-[#F9EBEB] min-h-screen flex items-center justify-center">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F7D6D6]">
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2">
        {/* Left Panel */}
        <div className="hidden md:flex flex-col items-center justify-center p-12 relative">
          <Image
            src="/8eh.png"
            alt="8EH Radio Logo"
            width={300}
            height={300}
            objectFit="contain"
          />
          <h2 className="font-heading text-4xl font-bold italic text-[#E36F6F] mt-4">
            #MembentangBingkai
          </h2>
        </div>

        {/* Right Panel */}
        <div className="flex flex-col items-center justify-center p-8">
          <div className="w-full max-w-sm text-center">
            {/* Logo for mobile view */}
            <div className="md:hidden mb-8">
              <Image
                src="/8eh.png"
                alt="8EH Radio Logo"
                width={150}
                height={150}
                className="mx-auto"
              />
            </div>

            <h1 className="text-5xl font-heading font-semibold text-gray-900">
              Ahoy, Kru’s!
            </h1>
            <p className="text-sm font-body text-gray-700 mt-6 mb-4">
              Login to your account
            </p>

            {errorMessage && (
              <div className="mb-4 rounded-md bg-red-100 border border-red-300 px-4 py-3 text-sm text-red-700 text-left">
                {errorMessage}
              </div>
            )}
            <ButtonPrimary
              onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
              className="w-full flex items-center justify-center py-3 text-base"
            >
              <Image
                src="/google.svg"
                alt="Google Logo"
                width={20}
                height={20}
                className="mr-2"
              />
              <span>Log in with Google Account</span>
            </ButtonPrimary>
          </div>
        </div>
      </div>
      <footer className="text-xs text-gray-500 font-body text-center py-4 mb-4">
        © {new Date().getFullYear()} Technic 8EH Radio ITB. All rights reserved.
      </footer>
    </div>
  );

}
