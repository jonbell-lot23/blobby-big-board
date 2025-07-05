"use client";

import type React from "react";

import { useState, useRef, useEffect, type MouseEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import TaskBlob from "@/components/task-blob";
import GooeyFilter from "@/components/gooey-filter";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";

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

  // State for create button rename prompt
  const [showCreateRenamePrompt, setShowCreateRenamePrompt] = useState(false);
  const [createRenameLabel, setCreateRenameLabel] = useState("Project");
  const [pendingNewTask, setPendingNewTask] = useState<Task | null>(null);

  // State for create button context menu
  const [showCreateContextMenu, setShowCreateContextMenu] = useState(false);
  const [createContextMenuPosition, setCreateContextMenuPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);

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

    // Position new ball completely differently for desktop vs mobile
    const containerWidth =
      containerRef.current?.clientWidth || window.innerWidth;
    const containerHeight =
      containerRef.current?.clientHeight || window.innerHeight;

    let newX: number;
    let newY: number;

    // Check if we're on mobile (width < 768px, matching Tailwind's md breakpoint)
    if (containerWidth < 768) {
      // Mobile: Position in the main blue card area (center of screen)
      newX = containerWidth / 2 - BALL_SIZE / 2; // Center horizontally
      newY = containerHeight / 2 - BALL_SIZE / 2; // Center vertically in the blue card
    } else {
      // Desktop: Position in left quarter of screen (green circle area)
      newX = containerWidth / 4 - BALL_SIZE / 2;
      newY = containerHeight / 2 - BALL_SIZE / 2;
    }

    const newTask: Task = {
      id: newId,
      label: "Project",
      size: BALL_SIZE,
      color: CIRCLE_COLOR,
      x: newX,
      y: newY,
    };

    // Store the pending task and show rename prompt
    setPendingNewTask(newTask);
    setCreateRenameLabel("Project");
    setShowCreateRenamePrompt(true);
  };

  // Handle create button right-click
  const handleCreateButtonContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setCreateContextMenuPosition({ x: e.clientX, y: e.clientY });
    setShowCreateContextMenu(true);
  };

  // Handle create rename submit
  const handleCreateRenameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pendingNewTask) {
      const finalTask = { ...pendingNewTask, label: createRenameLabel };
      const newTasks = [...tasks, finalTask];
      setTasks(newTasks);
      saveToLocalStorage(newTasks);
    }
    setShowCreateRenamePrompt(false);
    setPendingNewTask(null);
    setCreateRenameLabel("Project");
  };

  // Handle create rename cancel
  const handleCreateRenameCancel = () => {
    setShowCreateRenamePrompt(false);
    setPendingNewTask(null);
    setCreateRenameLabel("Project");
  };

  // Handle deleting a task
  const handleDeleteTask = (id: number) => {
    const newTasks = tasks.filter((task) => task.id !== id);
    setTasks(newTasks);
    saveToLocalStorage(newTasks);
    setShowRenamePrompt(false);
    setRenameBlobId(null);
    setRenameBlobLabel("");
    setRenameBlobPosition(null);
  };

  // Handler for when a rename is requested (right-click on existing blob)
  const handleRenameRequest = (
    id: number,
    currentLabel: string,
    position: { x: number; y: number }
  ) => {
    console.log("RENAME REQUEST RECEIVED - ID:", id, "Position:", position);
    console.log("Setting showRenamePrompt to true");
    setRenameBlobId(id);
    setRenameBlobLabel(currentLabel);
    setRenameBlobPosition(position);
    setShowRenamePrompt(true);
    console.log("State should be updated now");
  };

  // Handler for submitting the rename form (for existing blobs)
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

  // Handler for canceling the rename prompt (for existing blobs)
  const handleRenameCancel = () => {
    setShowRenamePrompt(false);
    setRenameBlobId(null);
    setRenameBlobLabel("");
    setRenameBlobPosition(null);
  };

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setShowCreateContextMenu(false);
      setCreateContextMenuPosition(null);
    };

    if (showCreateContextMenu) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [showCreateContextMenu]);

  // Select all text in rename input when prompt is shown
  useEffect(() => {
    if (showRenamePrompt && renameInputRef.current) {
      renameInputRef.current.select();
    }
  }, [showRenamePrompt]);

  // Debug state changes
  useEffect(() => {
    console.log(
      "State change - showRenamePrompt:",
      showRenamePrompt,
      "position:",
      renameBlobPosition
    );
  }, [showRenamePrompt, renameBlobPosition]);

  return (
    <div className="relative w-screen h-screen overflow-hidden">
      {/* Gooey filter for blob effects */}
      <GooeyFilter />

      {/* Dotted background pattern at the lowest z-index */}
      <div className="absolute inset-0 -z-20 w-full h-full bg-dot-pattern" />
      {/* Background: Completely different layouts for desktop vs mobile */}
      <div className="pointer-events-none absolute inset-0 -z-10 w-full h-full">
        {/* Desktop: 3 circles - green on left, blue in center, gray on right */}
        <div className="hidden md:block">
          {/* Green circle on the left (smaller, falling off the edge) */}
          <div className="absolute left-0 top-1/2 w-[480px] h-[480px] rounded-full bg-zone-mint transform -translate-x-1/2 -translate-y-1/2" />

          {/* Blue circle in the center with darker core */}
          <div className="absolute left-1/2 top-1/2 w-[625px] h-[625px] rounded-full bg-zone-sky transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
            <div className="w-[312px] h-[312px] rounded-full bg-blue-400" />
          </div>

          {/* Gray circle on the right (half visible) */}
          <div className="absolute right-0 top-1/2 w-[480px] h-[480px] rounded-full bg-zone-gray transform translate-x-1/2 -translate-y-1/2" />
        </div>

        {/* Mobile: Card-based layout with sections */}
        <div className="block md:hidden">
          {/* Header section - Green */}
          <div className="absolute top-0 left-0 w-full h-32 bg-zone-mint rounded-b-3xl" />

          {/* Main content area - Blue with rounded corners */}
          <div className="absolute top-24 left-4 right-4 bottom-32 bg-zone-sky rounded-3xl shadow-lg" />

          {/* Footer section - Gray */}
          <div className="absolute bottom-0 left-0 w-full h-32 bg-zone-gray rounded-t-3xl" />
        </div>
      </div>

      {/* This is the main container where task balls live - Mobile optimized */}
      <div
        ref={containerRef}
        className="relative w-full h-full md:w-full md:h-full"
      >
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
              onDeleteRequest={handleDeleteTask}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Circular Create New Button - Different positioning for mobile */}
      <div className="absolute top-4 left-4 md:top-4 md:left-4 z-10">
        <button
          onClick={handleCreateNewBall}
          onContextMenu={handleCreateButtonContextMenu}
          className="w-12 h-12 md:w-12 md:h-12 rounded-full bg-transparent hover:bg-gray-100 text-black border-2 border-black p-0 flex items-center justify-center cursor-pointer"
        >
          <Plus size={20} />
        </button>
      </div>

      {/* Create Button Context Menu */}
      {showCreateContextMenu && createContextMenuPosition && (
        <div
          className="absolute bg-gray-800 rounded-lg shadow-xl z-50 py-2 min-w-32"
          style={{
            left: createContextMenuPosition.x,
            top: createContextMenuPosition.y,
          }}
        >
          <button
            onClick={() => {
              setShowCreateContextMenu(false);
              setShowClearConfirm(true);
            }}
            className="w-full px-4 py-2 text-left text-red-400 hover:bg-gray-700 transition-colors"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Create Button Rename Prompt - Responsive positioning */}
      {showCreateRenamePrompt && (
        <div
          className="absolute bg-gray-700 p-4 rounded-lg shadow-xl z-50 max-w-xs md:max-w-none"
          style={{
            left: window.innerWidth < 768 ? 16 : 80, // Mobile: left margin, Desktop: to the right of button
            top: window.innerWidth < 768 ? 80 : 20, // Mobile: below button, Desktop: aligned with button
            right: window.innerWidth < 768 ? 16 : "auto", // Mobile: right margin
          }}
        >
          <form
            onSubmit={handleCreateRenameSubmit}
            className="flex flex-col gap-2"
          >
            <input
              type="text"
              value={createRenameLabel}
              onChange={(e) => setCreateRenameLabel(e.target.value)}
              className="p-2 rounded bg-gray-800 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Project name"
              autoFocus
              onFocus={(e) => e.target.select()}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  handleCreateRenameCancel();
                }
              }}
            />
            <div className="flex gap-2">
              <Button
                type="submit"
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white"
              >
                Create
              </Button>
              <Button
                type="button"
                onClick={handleCreateRenameCancel}
                className="flex-1 bg-gray-500 hover:bg-gray-600 text-white"
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

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
          onLoad={() => console.log("Rename dialog rendered!")}
        >
          {/* Trash icon in bottom right */}
          <button
            onClick={() =>
              renameBlobId !== null && handleDeleteTask(renameBlobId)
            }
            className="absolute -bottom-2 -right-2 w-8 h-8 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white shadow-lg"
          >
            <Trash2 size={14} />
          </button>

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
