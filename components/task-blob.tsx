"use client";

import type React from "react";

import { motion, useMotionValue, type PanInfo } from "framer-motion";
import type { RefObject } from "react";

type TaskBlobProps = {
  id: number;
  label: string;
  size: number;
  color: string;
  initialPosition: { x: number; y: number };
  dragConstraintsRef: RefObject<HTMLElement>;
  onDragEnd: (id: number, newX: number, newY: number) => void;
  onRenameRequest: (
    id: number,
    currentLabel: string,
    position: { x: number; y: number }
  ) => void;
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
}: TaskBlobProps) {
  // These motion values track the blob's position, allowing Framer Motion to control transforms.
  const x = useMotionValue(initialPosition.x);
  const y = useMotionValue(initialPosition.y);

  const handleDragEnd = (
    event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo
  ) => {
    // Get the current transformed position from the motion values
    const currentX = x.get();
    const currentY = y.get();
    onDragEnd(id, currentX, currentY);
  };

  // Handle right-click to bring up rename prompt
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent default browser context menu
    // Pass the current position of the blob to the parent for prompt placement
    onRenameRequest(id, label, { x: x.get(), y: y.get() });
  };

  return (
    <motion.div
      // Framer Motion properties for drag and animation
      drag
      dragConstraints={dragConstraintsRef}
      dragMomentum={false} // Disable "throwing" momentum
      dragElastic={0.2} // Controls the "bounciness" when hitting constraints
      onDragEnd={handleDragEnd}
      onContextMenu={handleContextMenu} // Handle right-click
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
      className="absolute flex items-center justify-center rounded-full cursor-grab select-none"
      style={{
        width: size,
        height: size,
        backgroundColor: color,
        // Use motion values for x and y to allow Framer Motion to control transforms
        x,
        y,
      }}
    >
      {/* The label is inside the blob, so it will be slightly affected by the filter.
          For a "Sunday project" this is acceptable as per your notes. */}
      <span
        className="text-white font-chewy text-base md:text-lg text-center p-2 break-words pointer-events-none drop-shadow leading-tight max-w-xs"
        style={{ textShadow: "0 1px 2px rgba(0,0,0,0.25)" }}
      >
        {label}
      </span>
    </motion.div>
  );
}
