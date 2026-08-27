"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import ButtonPrimary from "@/app/components/ButtonPrimary";

const RadioPlayer = dynamic(() => import("@/app/components/RadioPlayer"), {
  ssr: false,
});

export default function HeroSection() {
  const router = useRouter();
  const [isSafari, setIsSafari] = useState(false);

  useEffect(() => {
    if (typeof navigator !== "undefined") {
      const ua = navigator.userAgent;
      const detectedSafari =
        /Safari/i.test(ua) &&
        !/Chrome|Chromium|OPR|Edg|CriOS|FxiOS|EdgiOS/i.test(ua);
      setIsSafari(detectedSafari);
    }
  }, []);

  return (
    <section
      className="relative bg-[#FDFBF6] pt-28 pb-0 overflow-hidden"
      role="banner"
      aria-label="Welcome to 8EH Radio ITB"
    >
      {/* Decorative gradient blob */}
      <Image
        src="/mastercard.png"
        alt="Abstract background gradient for 8EH Radio ITB hero section"
        width={2000}
        height={434}
        className="absolute -top-10 left-160 -translate-x-1/2 pointer-events-none select-none opacity-70 z-0"
        sizes="100vw"
        quality={55}
      />

      {/* Content container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 grid md:grid-cols-2 gap-x-8 items-start">
        {/* Text */}
        <div className="md:col-span-1">
          <h1 className="font-accent font-bold text-5xl sm:text-6xl md:text-7xl leading-tight text-gray-900">
            Welcome to <br />
            8EH Radio ITB
          </h1>
        </div>
        {/* CTA */}
        <div className="space-y-6 md:col-span-1 md:text-left mt-8 md:mt-2">
          <p className="font-body text-base text-gray-700 max-w-sm">
            Dengarkan 8EH Radio untuk kabar terkini seputar kampus, musik hits,
            dan hiburan seru! Bergabunglah dengan komunitas kami dan temukan
            dunia dengan kreativitas dan keseruan tanpa batas!
          </p>
          <div className="flex items-center gap-4 justify-start">
            <ButtonPrimary
              className="!bg-[#EA4A30] !text-white hover:!bg-[#D0402A] !px-8 !py-3"
              onClick={() => router.push("/about-us")}
              aria-label="Learn more about 8EH Radio ITB"
            >
              Learn More
            </ButtonPrimary>
            <a
              href="https://www.instagram.com/regenerasi8eh/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block"
              aria-label="Follow us on Instagram"
            >
              <ButtonPrimary className="!bg-[#EFEAE6]/80 !text-[#444] hover:!bg-[#E5DED8] !px-8 !py-3">
                Join
              </ButtonPrimary>
            </a>
          </div>
        </div>
      </div>

      {/* Radio Image with Fade */}
      <div className="relative -mt-36 md:-mt-60 flex justify-center">
        <Image
          src="/radio-home.png"
          alt="8EH Radio ITB Studio Illustration"
          width={1200}
          height={700}
          className={`[mask-image:linear-gradient(to_bottom,black_60%,transparent_100%)] ${!isSafari ? "mix-blend-multiply" : ""}`}
          sizes="(min-width: 1024px) 1200px, 100vw"
          quality={75}
          priority
        />
      </div>

      {/* Sticky small player (desktop) */}
      <div className="hidden">
        <RadioPlayer compact />
      </div>
    </section>
  );
}
