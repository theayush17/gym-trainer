"use client";

import { X } from "lucide-react";
import type { ContentItem } from "@/lib/content";
import { getBmiCategoryLabel, getContentTypeLabel, getPlanLevelLabel } from "@/lib/content";
import { useEffect } from "react";

type ContentModalProps = {
  item: ContentItem;
  onClose: () => void;
};

export function ContentModal({ item, onClose }: ContentModalProps) {
  // Prevent scrolling when modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6"
      aria-modal="true"
      role="dialog"
    >
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="relative z-10 w-full max-w-2xl transform overflow-hidden rounded-2xl bg-gray-900 p-6 shadow-2xl transition-all border border-gray-800">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">{item.title}</h2>
            <div className="mt-2 flex flex-wrap gap-2 items-center">
              <span className="theme-badge !bg-blue-600/20 !text-blue-400 !border-blue-600/30">
                {getPlanLevelLabel(item.planLevel)}
              </span>
              <span className="text-gray-500 text-xs uppercase tracking-widest font-medium">
                Day {item.dayNumber} • {getBmiCategoryLabel(item.bmiCategory)}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-6">
          <div className="rounded-xl bg-gray-800/50 p-4 border border-gray-800">
             <p className="text-gray-300 leading-relaxed text-lg">
              {item.description}
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Category</span>
            <span className="text-sm text-blue-400 font-semibold">{getContentTypeLabel(item.type)}</span>
          </div>

          {/* This section can be expanded if ContentItem has more details like 'instructions' or 'ingredients' */}
          {item.content && (
             <div className="mt-4 pt-4 border-t border-gray-800">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 block">Detailed Content</span>
                <div className="text-gray-300 whitespace-pre-wrap leading-relaxed">
                    {item.content}
                </div>
             </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-500 transition-colors shadow-lg shadow-blue-600/20"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
