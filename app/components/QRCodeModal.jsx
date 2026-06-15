'use client';
import { useRef } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { FiX, FiDownload } from "react-icons/fi";
import ButtonPrimary from "@/app/components/ButtonPrimary";

export default function QRCodeModal({ shortLink, isOpen, onClose }) {
  const canvasRef = useRef(null);

  if (!isOpen || !shortLink) return null;

  const url = `https://8eh.link/${shortLink.slug}`;

  const handleDownload = () => {
    const source = canvasRef.current;
    if (!source) return;

    // Buat canvas baru sebagai target download
    const out = document.createElement("canvas");
    out.width = source.width;
    out.height = source.height;
    const ctx = out.getContext("2d");

    // Salin QR code
    ctx.drawImage(source, 0, 0);

    const cx = out.width / 2;
    const cy = out.height / 2;
    const radius = 28;

    // Lingkaran putih sebagai background logo
    ctx.beginPath();
    ctx.arc(cx, cy, radius + 6, 0, 2 * Math.PI);
    ctx.fillStyle = "white";
    ctx.fill();

    // Gambar logo dikrop bulat
    const img = new Image();
    img.onload = () => {
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
      ctx.clip();
      ctx.drawImage(img, cx - radius, cy - radius, radius * 2, radius * 2);
      ctx.restore();

      const link = document.createElement("a");
      link.download = `8eh-qr-${shortLink.slug}.png`;
      link.href = out.toDataURL("image/png");
      link.click();
    };
    img.src = "/8eh.png";
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ backgroundColor: "rgba(17,24,39,0.25)" }}
      onClick={handleBackdropClick}
    >
      <div
        className="bg-white rounded-xl p-6 max-w-sm w-full mx-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-heading font-bold text-gray-900">QR Code</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100"
          >
            <FiX size={24} />
          </button>
        </div>

        <div className="flex flex-col items-center gap-4">
          <div className="p-4 bg-white border border-gray-200 rounded-xl shadow-sm">
            {/* QR code + logo overlay pakai CSS, tidak sentuh canvas */}
            <div className="relative inline-block">
              <QRCodeCanvas
                ref={canvasRef}
                value={url}
                size={220}
                level="H"
              />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-14 h-14 rounded-full overflow-hidden bg-white p-1 shadow-sm">
                  <img
                    src="/8eh.png"
                    alt="8EH Radio ITB"
                    className="w-full h-full object-cover rounded-full"
                  />
                </div>
              </div>
            </div>
          </div>
          <p className="text-sm text-blue-600 font-body font-medium">{url}</p>
          {shortLink.title && (
            <p className="text-sm text-gray-500 font-body">{shortLink.title}</p>
          )}
        </div>

        <div className="mt-6">
          <ButtonPrimary onClick={handleDownload} className="!w-full !flex !items-center !justify-center !gap-2">
            <FiDownload size={16} />
            Download PNG
          </ButtonPrimary>
        </div>
      </div>
    </div>
  );
}
