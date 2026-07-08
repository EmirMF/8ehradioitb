"use client";

import { useState } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import ButtonPrimary from "@/app/components/ButtonPrimary";

const PodcastAudioPlayer = dynamic(
  () => import("@/app/components/PodcastAudioPlayer"),
  { ssr: false },
);

export default function PodcastList({ podcasts = [] }) {
  const [currentPodcast, setCurrentPodcast] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const handlePlayPause = (pod) => {
    if (currentPodcast && currentPodcast.id === pod.id) {
      // Same podcast - toggle play/pause
      setIsPlaying((prev) => !prev);
    } else {
      // Different podcast - switch to new one and play
      setCurrentPodcast(pod);
      // Small delay to ensure state updates before playing
      setTimeout(() => {
        setIsPlaying(true);
      }, 100);
    }
  };

  return (
    <section className="pt-12 pb-16 bg-white relative overflow-hidden">
      {/* Background decorative blob */}
      <div className="absolute -right-1/8 -top-1/8 w-1/2 h-full z-0 pointer-events-none">
        <Image
          src="/vstock-home.png"
          alt="background decorative gradient"
          width={800}
          height={800}
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <h2 className="font-accent text-5xl sm:text-6xl text-gray-900 mb-4">
          Listen to Our Podcast
        </h2>
        <div className="w-1/2 sm:w-1/3 border-t-2 border-gray-200 mb-10" />

        {/* Podcasts List */}
        {podcasts.length > 0 ? (
          <div className="space-y-4">
            {podcasts.map((pod, idx) => {
              const playing =
                currentPodcast && currentPodcast.id === pod.id && isPlaying;
              return (
                <div
                  key={pod.id || idx}
                  className="flex items-start gap-4 sm:gap-6 py-8 border-b border-gray-200/80 last:border-b-0"
                >
                  {/* Image */}
                  <div className="w-28 h-28 sm:w-32 sm:h-32 md:w-40 md:h-40 relative flex-shrink-0">
                    <Image
                      src={pod.image || pod.coverImage || "/8eh-real.svg"}
                      alt="Podcast Thumbnail"
                      fill
                      sizes="(min-width: 768px) 160px, (min-width: 640px) 128px, 112px"
                      quality={65}
                      className="object-cover rounded-2xl shadow-md"
                    />
                  </div>
                  {/* Details */}
                  <div className="flex-1">
                    <h3 className="font-heading text-lg sm:text-xl text-gray-900 font-bold mb-2">
                      {pod.title}
                    </h3>
                    <p className="font-body text-sm text-gray-500 mb-2">
                      {pod.subtitle}
                    </p>
                    <p className="font-body text-sm text-gray-600 mb-4 leading-relaxed">
                      {pod.description}
                    </p>
                    <div className="flex justify-between items-center mt-4">
                      <p className="font-body text-xs sm:text-sm text-gray-500">
                        {pod.date} &bull; {pod.duration}
                      </p>
                      <ButtonPrimary
                        className="!w-12 !h-12 !p-0 !rounded-full flex items-center justify-center flex-shrink-0"
                        aria-label={playing ? "Pause Podcast" : "Play Podcast"}
                        onClick={() => handlePlayPause(pod)}
                      >
                        {playing ? (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5 text-white"
                            fill="white"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <rect x="6" y="5" width="4" height="14" />
                            <rect x="14" y="5" width="4" height="14" />
                          </svg>
                        ) : (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5 text-white"
                            fill="white"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <polygon points="6,4 20,12 6,20" fill="white" />
                          </svg>
                        )}
                      </ButtonPrimary>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            No podcasts available yet.
          </div>
        )}

        {/* View All Button */}
        <div className="text-center mt-12">
          <ButtonPrimary
            className="!bg-gray-100 !text-gray-800 hover:!bg-gray-200 !font-medium !px-8 !py-3"
            onClick={() => window.open("/podcast", "_self")}
          >
            View all
          </ButtonPrimary>
        </div>
      </div>

      {/* Render PodcastAudioPlayer if a podcast is selected */}
      {currentPodcast && (
        <PodcastAudioPlayer
          audioUrl={currentPodcast.audioUrl}
          title={currentPodcast.title}
          image={
            currentPodcast.image || currentPodcast.coverImage || "/8eh-real.svg"
          }
          subtitle={currentPodcast.subtitle}
          description={currentPodcast.description}
          isPlaying={isPlaying}
          setIsPlaying={setIsPlaying}
        />
      )}
    </section>
  );
}
