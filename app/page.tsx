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
const BALL_SIZE = 80;

// Prettier pastel colors for background stripes
const BG_MINT = "#6EE7B7"; // top green
const BG_MINT_DIM = "#A7F3D0"; // bottom green
const BG_SKY = "#60A5FA"; // top blue
const BG_SKY_DIM = "#93C5FD"; // bottom blue
const BG_GRAY = "#9CA3AF"; // top gray
const BG_GRAY_DIM = "#E5E7EB"; // bottom gray

// Blue color for all circles
const CIRCLE_COLOR = "#3b82f6";

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

export default function BlobbyTrackerPage() {
  const [tasks, setTasks] = useState<Task[]>(defaultTasks);
  const [isClient, setIsClient] = useState(false);
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  // Load from localStorage after component mounts
  useEffect(() => {
    setIsClient(true);
    const saved = localStorage.getItem("circles");
    if (saved) {
      setTasks(JSON.parse(saved));
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
    <div className="relative w-screen h-screen bg-gray-900/80 overflow-hidden">
      {/* Background: 3 vertical stripes, each split horizontally for 6 zones */}
      <div className="pointer-events-none absolute inset-0 -z-10 w-full h-full flex">
        {/* Mint stripe */}
        <div className="relative w-1/3 h-full">
          <div
            className="absolute top-0 left-0 w-full h-1/2"
            style={{ background: BG_MINT }}
          />
          <div
            className="absolute bottom-0 left-0 w-full h-1/2"
            style={{ background: BG_MINT_DIM }}
          />
        </div>
        {/* Sky blue stripe */}
        <div className="relative w-1/3 h-full">
          <div
            className="absolute top-0 left-0 w-full h-1/2"
            style={{ background: BG_SKY }}
          />
          <div
            className="absolute bottom-0 left-0 w-full h-1/2"
            style={{ background: BG_SKY_DIM }}
          />
        </div>
        {/* Light gray stripe */}
        <div className="relative w-1/3 h-full">
          <div
            className="absolute top-0 left-0 w-full h-1/2"
            style={{ background: BG_GRAY }}
          />
          <div
            className="absolute bottom-0 left-0 w-full h-1/2"
            style={{ background: BG_GRAY_DIM }}
          />
        </div>
      </div>

      {/* This is the main container where task balls live */}
      <div ref={containerRef} className="relative w-full h-full">
        <AnimatePresence>
          {tasks.map((task) => (
            <TaskBlob
              key={task.id}
              id={task.id}
              label={task.label}
              size={task.size}
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
