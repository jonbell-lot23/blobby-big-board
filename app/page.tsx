"use client";

import type React from "react";

import { useState, useRef, useEffect, type MouseEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import TaskBlob from "@/components/task-blob";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

// Define the type for a single task
type Task = {
  id: number;
  label: string;
  size: number; // Diameter of the blob
  color: string;
  x: number; // X position relative to container
  y: number; // Y position relative to container
};

// Standard size for all balls
const BALL_SIZE = 100;
const MIN_BALL_SIZE = 80;
const MAX_BALL_SIZE = 200;

// Prettier pastel colors for background stripes
const BG_MINT = "#6EE7B7"; // top green
const BG_MINT_DIM = "#A7F3D0"; // bottom green
const BG_SKY = "#60A5FA"; // top blue
const BG_SKY_DIM = "#93C5FD"; // bottom blue
const BG_GRAY = "#9CA3AF"; // top gray
const BG_GRAY_DIM = "#E5E7EB"; // bottom gray

// Black color for all circles
const CIRCLE_COLOR = "#000000";

// Default tasks
const defaultTasks: Task[] = [
  {
    id: 1,
    label: "Circle 1",
    size: BALL_SIZE,
    color: CIRCLE_COLOR,
    x: 300,
    y: 300,
  },
  {
    id: 2,
    label: "Circle 2",
    size: BALL_SIZE,
    color: CIRCLE_COLOR,
    x: 600,
    y: 300,
  },
  {
    id: 3,
    label: "Circle 3",
    size: BALL_SIZE,
    color: CIRCLE_COLOR,
    x: 900,
    y: 300,
  },
];

// Helper to calculate circle size based on label length
function getCircleSize(label: string) {
  const min = 80;
  const perChar = 14; // px per character
  return Math.max(min, label.length * perChar);
}

function getDynamicBallSize(label: string) {
  // Base size plus 10px per character, clamped between min and max
  return Math.max(
    MIN_BALL_SIZE,
    Math.min(MAX_BALL_SIZE, MIN_BALL_SIZE + (label.length - 6) * 10)
  );
}

export default function BlobbyTrackerPage() {
  const [tasks, setTasks] = useState<Task[]>(defaultTasks);
  const [isClient, setIsClient] = useState(false);
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  // Load from localStorage after component mounts
  useEffect(() => {
    setIsClient(true);
    const saved = localStorage.getItem("circles");
    if (saved) {
      const parsedTasks = JSON.parse(saved);
      // Migrate any old blue circles to black
      const migratedTasks = parsedTasks.map((task: Task) => ({
        ...task,
        color: "#000000", // Force all circles to be black
      }));
      setTasks(migratedTasks);
      // Save the migrated tasks back to localStorage
      localStorage.setItem("circles", JSON.stringify(migratedTasks));
    }
  }, []);
  const containerRef = useRef<HTMLDivElement>(null);

  // State for the rename prompt
  const [showRenamePrompt, setShowRenamePrompt] = useState(false);
  const [renameBlobId, setRenameBlobId] = useState<number | null>(null);
  const [renameBlobLabel, setRenameBlobLabel] = useState("");
  const [renameBlobPosition, setRenameBlobPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);

  // State for clear all confirmation dialog
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Ref for rename input
  const renameInputRef = useRef<HTMLInputElement>(null);

  // Save to localStorage whenever tasks change
  const saveToLocalStorage = (newTasks: Task[]) => {
    if (isClient) {
      localStorage.setItem("circles", JSON.stringify(newTasks));
    }
  };

  // This function handles updating a task's position after being dragged.
  const handleDragEnd = (id: number, newX: number, newY: number) => {
    const newTasks = tasks.map((task) =>
      task.id === id ? { ...task, x: newX, y: newY } : task
    );
    setTasks(newTasks);
    saveToLocalStorage(newTasks);
  };

  // Handle clearing all tasks
  const handleClearAll = () => {
    setTasks([]);
    saveToLocalStorage([]);
    setShowClearConfirm(false);
  };

  // Handle new ball creation on click
  const handleCreateNewBall = () => {
    const newId = Date.now();

    // Position new ball in center of container
    const containerWidth =
      containerRef.current?.clientWidth || window.innerWidth;
    const containerHeight =
      containerRef.current?.clientHeight || window.innerHeight;
    const newX = containerWidth / 2 - BALL_SIZE / 2;
    const newY = containerHeight / 2 - BALL_SIZE / 2;

    const newTask: Task = {
      id: newId,
      label: "Project",
      size: BALL_SIZE,
      color: CIRCLE_COLOR,
      x: newX,
      y: newY,
    };
    const newTasks = [...tasks, newTask];
    setTasks(newTasks);
    saveToLocalStorage(newTasks);

    // Immediately ask for name
    setTimeout(() => {
      handleRenameRequest(newId, "Project", {
        x: newX + BALL_SIZE / 2,
        y: newY + BALL_SIZE / 2,
      });
    }, 100);
  };

  // Handler for when a rename is requested (right-click)
  const handleRenameRequest = (
    id: number,
    currentLabel: string,
    position: { x: number; y: number }
  ) => {
    setRenameBlobId(id);
    setRenameBlobLabel(currentLabel);
    setRenameBlobPosition(position);
    setShowRenamePrompt(true);
  };

  // Handler for submitting the rename form
  const handleRenameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (renameBlobId !== null) {
      const newTasks = tasks.map((task) =>
        task.id === renameBlobId ? { ...task, label: renameBlobLabel } : task
      );
      setTasks(newTasks);
      saveToLocalStorage(newTasks);
    }
    setShowRenamePrompt(false);
    setRenameBlobId(null);
    setRenameBlobLabel("");
    setRenameBlobPosition(null);
  };

  // Handler for canceling the rename prompt
  const handleRenameCancel = () => {
    setShowRenamePrompt(false);
    setRenameBlobId(null);
    setRenameBlobLabel("");
    setRenameBlobPosition(null);
  };

  // Select all text in rename input when prompt is shown
  useEffect(() => {
    if (showRenamePrompt && renameInputRef.current) {
      renameInputRef.current.select();
    }
  }, [showRenamePrompt]);

  return (
    <div className="relative w-screen h-screen overflow-hidden">
      {/* Dotted background pattern at the lowest z-index */}
      <div className="absolute inset-0 -z-20 w-full h-full bg-dot-pattern" />
      {/* Background: 3 circles - green on left, blue in center, gray on right */}
      <div className="pointer-events-none absolute inset-0 -z-10 w-full h-full">
        {/* Green circle on the left (smaller, falling off the edge) */}
        <div className="absolute left-0 top-1/2 w-[480px] h-[480px] rounded-full bg-zone-mint transform -translate-x-1/2 -translate-y-1/2" />

        {/* Blue circle in the center with darker core */}
        <div className="absolute left-1/2 top-1/2 w-[625px] h-[625px] rounded-full bg-zone-sky transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
          <div className="w-[312px] h-[312px] rounded-full bg-blue-400" />
        </div>

        {/* Gray circle on the right (half visible) */}
        <div className="absolute right-0 top-1/2 w-[480px] h-[480px] rounded-full bg-zone-gray transform translate-x-1/2 -translate-y-1/2" />
      </div>

      {/* This is the main container where task balls live */}
      <div ref={containerRef} className="relative w-full h-full">
        <AnimatePresence>
          {tasks.map((task) => (
            <TaskBlob
              key={task.id}
              id={task.id}
              label={task.label}
              size={BALL_SIZE}
              color={task.color}
              initialPosition={{ x: task.x, y: task.y }}
              dragConstraintsRef={containerRef}
              onDragEnd={handleDragEnd}
              onRenameRequest={handleRenameRequest}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Simple Create New Button */}
      <div className="absolute top-4 right-4 z-10">
        <Button
          onClick={handleCreateNewBall}
          className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded shadow"
        >
          Create new
        </Button>
      </div>

      {/* Clear All Button */}
      <div className="absolute top-4 left-4 z-10">
        <Button
          onClick={() => setShowClearConfirm(true)}
          variant="destructive"
          className="bg-red-600 hover:bg-red-700 text-white"
        >
          Clear all
        </Button>
      </div>

      {/* Clear All Confirmation Dialog */}
      {showClearConfirm && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg shadow-xl max-w-md mx-4">
            <h3 className="text-white text-lg font-bold mb-4">
              Clear all circles?
            </h3>
            <p className="text-gray-300 mb-6">
              This will permanently delete all circles. This action cannot be
              undone.
            </p>
            <div className="flex gap-3">
              <Button
                onClick={handleClearAll}
                variant="destructive"
                className="flex-1 bg-red-600 hover:bg-red-700"
              >
                Clear all
              </Button>
              <Button
                onClick={() => setShowClearConfirm(false)}
                variant="outline"
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white border-gray-600"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Rename Prompt */}
      {showRenamePrompt && renameBlobPosition && (
        <div
          className="absolute bg-gray-700 p-4 rounded-lg shadow-xl z-50"
          style={{
            left: renameBlobPosition.x,
            top: renameBlobPosition.y,
            transform: "translate(-50%, -50%)", // Center the prompt on the click point
          }}
        >
          <form onSubmit={handleRenameSubmit} className="flex flex-col gap-2">
            <input
              type="text"
              value={renameBlobLabel}
              onChange={(e) => setRenameBlobLabel(e.target.value)}
              className="p-2 rounded bg-gray-800 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="New name"
              autoFocus
              ref={renameInputRef}
              onFocus={(e) => e.target.select()}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  handleRenameCancel();
                }
              }}
            />
            <div className="flex gap-2">
              <Button
                type="submit"
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white"
              >
                Rename
              </Button>
              <Button
                type="button"
                onClick={handleRenameCancel}
                className="flex-1 bg-gray-500 hover:bg-gray-600 text-white"
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
