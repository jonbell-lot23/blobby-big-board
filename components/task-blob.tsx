"use client";

import type React from "react";
import { motion, useMotionValue, type PanInfo } from "framer-motion";
import type { RefObject } from "react";
import { Trash2, Edit3 } from "lucide-react";
import { hyphenateText } from "@/lib/utils";

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
  onDeleteRequest: (id: number) => void;
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
    >
      {/* Edit button - appears on hover */}
      <button
        onClick={handleEditClick}
        className="absolute -top-2 -right-2 w-6 h-6 bg-blue-500 hover:bg-blue-600 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity z-10"
      >
        <Edit3 size={12} />
      </button>

      {/* Delete button - appears on hover */}
      <button
        onClick={handleDeleteClick}
        className="absolute -top-2 -left-2 w-6 h-6 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity z-10"
      >
        <Trash2 size={12} />
      </button>

      {/* The label is inside the blob, so it will be slightly affected by the filter.
          For a "Sunday project" this is acceptable as per your notes. */}
      <span
        className="text-white font-chewy text-base md:text-lg text-center p-2 break-words pointer-events-none drop-shadow leading-none max-w-xs"
        style={{ textShadow: "0 1px 2px rgba(0,0,0,0.25)", lineHeight: "1rem" }}
      >
        {hyphenateText(label)}
      </span>
    </motion.div>
  );
}
