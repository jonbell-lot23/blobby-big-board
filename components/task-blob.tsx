"use client";

import React, { useRef, useEffect, useState } from "react";
import { motion, useMotionValue, type PanInfo } from "framer-motion";
import type { RefObject } from "react";
import { Trash2, Edit3 } from "lucide-react";
import { hyphenateText } from "@/lib/utils";

type TaskBlobProps = {
  id: string | number;
  label: string;
  size: number;
  color: string;
  initialPosition: { x: number; y: number };
  dragConstraintsRef: RefObject<HTMLElement>;
  onDragEnd: (id: string | number, newX: number, newY: number) => void;
  onRenameRequest: (
    id: string | number,
    currentLabel: string,
    position: { x: number; y: number }
  ) => void;
  onDeleteRequest: (id: string | number) => void;
};

/**
 * Represents a single draggable task blob.
 * It uses Framer Motion for drag-and-drop functionality and animations.
 */
export default function TaskBlob({
  id,
  label,
  size,
  color,
  initialPosition,
  dragConstraintsRef,
  onDragEnd,
  onRenameRequest,
  onDeleteRequest,
  isEditMode = false,
  onEditModeChange,
}: TaskBlobProps & {
  isEditMode?: boolean;
  onEditModeChange?: (active: boolean) => void;
}) {
  // These motion values track the blob's position, allowing Framer Motion to control transforms.
  const x = useMotionValue(initialPosition.x);
  const y = useMotionValue(initialPosition.y);

  // Ref and state for overflow detection
  const labelRef = useRef<HTMLSpanElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  const [positionRatio, setPositionRatio] = useState<{
    x: number;
    y: number;
  } | null>(null);

  // State for delayed hover icons
  const [showIcons, setShowIcons] = useState(false);
  const hoverTimeout = useRef<NodeJS.Timeout | null>(null);
  const hoverCount = useRef(0);

  useEffect(() => {
    if (dragConstraintsRef.current) {
      const containerRect = dragConstraintsRef.current.getBoundingClientRect();
      setPositionRatio({
        x: initialPosition.x / containerRect.width,
        y: initialPosition.y / containerRect.height,
      });
    }
  }, [dragConstraintsRef, initialPosition]);

  useEffect(() => {
    const updatePosition = () => {
      if (dragConstraintsRef.current && positionRatio) {
        const containerRect =
          dragConstraintsRef.current.getBoundingClientRect();
        x.set(positionRatio.x * containerRect.width);
        y.set(positionRatio.y * containerRect.height);
      }
    };
    window.addEventListener("resize", updatePosition);
    return () => window.removeEventListener("resize", updatePosition);
  }, [dragConstraintsRef, positionRatio, x, y]);

  useEffect(() => {
    const checkOverflow = () => {
      const el = labelRef.current;
      if (!el) return;
      // Padding: p-2 = 0.5rem = 8px on each side
      const padding = 16; // 8px left + 8px right
      const available = size - padding;
      // Check if text is wider or taller than the available circle diameter
      setIsOverflowing(
        el.scrollWidth > available || el.scrollHeight > available
      );
    };
    checkOverflow();
  }, [label, size]);

  const handleDragEnd = (
    event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo
  ) => {
    const currentX = x.get();
    const currentY = y.get();
    if (dragConstraintsRef.current) {
      const containerRect = dragConstraintsRef.current.getBoundingClientRect();
      setPositionRatio({
        x: currentX / containerRect.width,
        y: currentY / containerRect.height,
      });
    }
    onDragEnd(id, currentX, currentY);
  };

  // Handle edit button click
  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    console.log("EDIT BUTTON CLICKED - ID:", id, "Label:", label);
    // Simple position - just use screen coordinates
    const rect = e.currentTarget.getBoundingClientRect();
    const dialogX = rect.left + rect.width / 2;
    const dialogY = rect.top + rect.height / 2;
    console.log("Dialog position:", dialogX, dialogY);
    onRenameRequest(id, label, { x: dialogX, y: dialogY });
  };

  // Handle delete button click
  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    console.log("DELETE BUTTON CLICKED - ID:", id, "Label:", label);
    onDeleteRequest(id);
  };

  const handleAnyMouseEnter = () => {
    hoverCount.current += 1;
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    setShowIcons(true);
  };
  const handleAnyMouseLeave = () => {
    hoverCount.current -= 1;
    if (hoverCount.current <= 0) {
      hoverTimeout.current = setTimeout(() => {
        setShowIcons(false);
        hoverCount.current = 0;
      }, 100);
    }
  };

  // Helper to split long single words into lines of 6 chars with hyphens
  function splitLongWord(
    text: string,
    lineLength: number = 6
  ): (string | JSX.Element)[] {
    if (text.includes(" ")) return [text];
    const lines = [];
    for (let i = 0; i < text.length; i += lineLength) {
      if (i > 0) lines.push(<br key={i} />);
      const chunk = text.slice(i, i + lineLength);
      // Add hyphen if not the last chunk
      if (i + lineLength < text.length) {
        lines.push(chunk + "-");
      } else {
        lines.push(chunk);
      }
    }
    return lines;
  }

  return (
    <motion.div
      // Framer Motion properties for drag and animation
      drag
      dragConstraints={dragConstraintsRef}
      dragMomentum={false} // Disable "throwing" momentum
      dragElastic={0.2} // Controls the "bounciness" when hitting constraints
      onDragEnd={handleDragEnd}
      // Initial and exit animations for when blobs are added/removed
      initial={{
        scale: 0,
        opacity: 0,
        x: initialPosition.x,
        y: initialPosition.y,
      }}
      animate={{
        scale: 1,
        opacity: 1,
        x: initialPosition.x,
        y: initialPosition.y,
      }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
      // Animation while dragging
      whileDrag={{ scale: 1.1, zIndex: 50, cursor: "grabbing" }}
      // Styling and positioning
      className="absolute flex items-center justify-center rounded-full cursor-grab select-none group"
      style={{
        width: size,
        height: size,
        backgroundColor: color,
        // Use motion values for x and y to allow Framer Motion to control transforms
        x,
        y,
      }}
      onMouseEnter={handleAnyMouseEnter}
      onMouseLeave={handleAnyMouseLeave}
    >
      {/* Edit button - appears on hover after 0.2s, stays visible if hovered */}
      <button
        onClick={handleEditClick}
        onMouseEnter={handleAnyMouseEnter}
        onMouseLeave={handleAnyMouseLeave}
        className={`absolute -top-2 -right-2 w-6 h-6 bg-blue-500 hover:bg-blue-600 rounded-full flex items-center justify-center text-white transition-opacity z-10 ${
          showIcons
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
        style={{ transitionDelay: showIcons ? "0s" : "0s" }}
        tabIndex={showIcons ? 0 : -1}
        aria-hidden={!showIcons}
      >
        <Edit3 size={12} />
      </button>

      {/* Delete button - appears on hover after 0.2s, stays visible if hovered */}
      <button
        onClick={handleDeleteClick}
        onMouseEnter={handleAnyMouseEnter}
        onMouseLeave={handleAnyMouseLeave}
        className={`absolute -top-2 -left-2 w-6 h-6 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white transition-opacity z-10 ${
          showIcons
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
        style={{ transitionDelay: showIcons ? "0s" : "0s" }}
        tabIndex={showIcons ? 0 : -1}
        aria-hidden={!showIcons}
      >
        <Trash2 size={12} />
      </button>

      {/* The label is inside the blob, so it will be slightly affected by the filter.
          For a "Sunday project" this is acceptable as per your notes. */}
      {/* Hidden span for overflow detection */}
      <span
        ref={labelRef}
        className="text-white font-chewy text-base text-center p-2 break-words pointer-events-none drop-shadow leading-none max-w-xs"
        style={{
          textShadow: "0 1px 2px rgba(0,0,0,0.25)",
          lineHeight: "1rem",
          position: "absolute",
          visibility: "hidden",
          pointerEvents: "none",
          zIndex: -1,
          width: size - 16, // account for padding
          maxWidth: "100%",
        }}
        aria-hidden="true"
      >
        {label}
      </span>
      <span
        className="text-white font-chewy text-base text-center p-2 break-words pointer-events-none drop-shadow leading-none max-w-xs"
        style={{ textShadow: "0 1px 2px rgba(0,0,0,0.25)", lineHeight: "1rem" }}
      >
        {splitLongWord(label, 6)}
      </span>
    </motion.div>
  );
}
