"use client";

import Image from "next/image";
import Link from "next/link";
import ButtonPrimary from "@/app/components/ButtonPrimary";

export default function NewsList({ newsItems = [] }) {
  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  return (
    <section className="py-16 bg-white relative">
      <div className="absolute top-10 left-1/4 opacity-80 -translate-x-1/2">
        <Image
          src="/vstock-home1.png"
          alt="decoration"
          width={150}
          height={150}
        />
      </div>
      <div className="absolute top-10 right-1/4 opacity-80 translate-x-1/2">
        <Image
          src="/vstock-home2.png"
          alt="decoration"
          width={150}
          height={150}
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
        <h2 className="font-accent text-6xl font-bold text-gray-900 mb-2">
          Latest Campus News
        </h2>
        <p className="font-body text-gray-600 mb-16">
          Selalu terhubung dengan kabar terbaru dan cerita seru seputar dunia
          kampus!
        </p>

        {newsItems.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 text-left">
            {newsItems.map((item, idx) => (
              <Link
                href={`/blog/${item.slug}`}
                key={item.id || idx}
                className="block group"
              >
                <div className="bg-gradient-to-b from-[#FEF9E7] to-[#F5E6A3] rounded-3xl shadow-sm overflow-hidden flex flex-col h-full p-4 transition-all duration-300 ease-in-out group-hover:shadow-xl group-hover:scale-[1.02]">
                  <div className="relative h-48 rounded-xl overflow-hidden">
                    <Image
                      src={item.mainImage || "/og-image.png"}
                      alt={item.title}
                      fill
                      sizes="(min-width: 768px) 33vw, (min-width: 640px) 50vw, 100vw"
                      quality={65}
                      className="object-cover"
                    />
                  </div>
                  <div className="pt-6 px-2 flex flex-col flex-grow">
                    <p className="font-body text-sm text-gray-500 mb-2 font-medium">
                      {item.category || "News"}
                    </p>
                    <h3 className="font-heading text-xl text-gray-900 font-bold mb-3">
                      {item.title}
                    </h3>
                    <p className="font-body text-sm text-gray-600 mb-6 flex-grow line-clamp-3">
                      {item.description || "No description available"}
                    </p>
                    <div className="flex items-center mt-auto">
                      <div className="w-10 h-10 relative mr-3">
                        <img
                          src={
                            item.authors?.[0]?.user?.image
                              ? item.authors[0].user.image.includes(
                                  "googleusercontent.com",
                                )
                                ? item.authors[0].user.image.replace(
                                    /=s\d+-c/,
                                    "=s150-c",
                                  )
                                : item.authors[0].user.image.startsWith("http")
                                  ? item.authors[0].user.image
                                  : `${window.location.origin}${item.authors[0].user.image}`
                              : "/8eh-real.svg"
                          }
                          alt={item.authors?.[0]?.user?.name || "Author"}
                          className="rounded-full w-full h-full object-cover"
                          onError={(e) => {
                            // Try alternative Google image size if it's a Google image
                            if (
                              e.target.src.includes("googleusercontent.com") &&
                              !e.target.src.includes("=s150-c")
                            ) {
                              e.target.src = e.target.src.replace(
                                /=s\d+-c/,
                                "=s150-c",
                              );
                            } else {
                              e.target.src = "/8eh-real.svg";
                              e.target.onerror = null; // Prevent infinite loop
                            }
                          }}
                          crossOrigin="anonymous"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div className="flex flex-col">
                        <p className="font-body font-semibold text-sm text-gray-800">
                          {item.authors?.[0]?.user?.name || "8EH Team"}
                        </p>
                        <p className="font-body text-xs text-gray-500">
                          {formatDate(item.createdAt)} &bull;{" "}
                          {item.readTime || "5 min read"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            No news articles available yet.
          </div>
        )}

        <div className="text-center mt-12">
          <ButtonPrimary
            className="!bg-gray-200 !text-gray-800 hover:!bg-gray-300 !font-medium !px-6 !py-2.5"
            onClick={() => {
              window.open("/blog", "_self");
            }}
          >
            View all
          </ButtonPrimary>
        </div>
      </div>
    </section>
  );
}
