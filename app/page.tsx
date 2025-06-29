"use client"

import type React from "react"

import { useState, useRef, type MouseEvent } from "react"
import { AnimatePresence } from "framer-motion"
import TaskBlob from "@/components/task-blob"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"

// Define the type for a single task
type Task = {
  id: number
  label: string
  size: number // Diameter of the blob
  color: string
  x: number // X position relative to container
  y: number // Y position relative to container
}

// Standard size for all balls
const BALL_SIZE = 200

// Initial set of tasks to populate the canvas
const initialTasks: Task[] = [
  { id: 1, label: "Green", size: BALL_SIZE, color: "#4ade80", x: 300, y: 300 },
  { id: 2, label: "Blue", size: BALL_SIZE, color: "#3b82f6", x: 600, y: 300 },
  { id: 3, label: "Grey", size: BALL_SIZE, color: "#6b7280", x: 900, y: 300 },
]

// Yellow color for new balls
const NEW_BALL_COLOR = "#fbbf24"

export default function BlobbyTrackerPage() {
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const containerRef = useRef<HTMLDivElement>(null)

  // State for the rename prompt
  const [showRenamePrompt, setShowRenamePrompt] = useState(false)
  const [renameBlobId, setRenameBlobId] = useState<number | null>(null)
  const [renameBlobLabel, setRenameBlobLabel] = useState("")
  const [renameBlobPosition, setRenameBlobPosition] = useState<{ x: number; y: number } | null>(null)

  // State for tracking if a ball is being dragged over the delete button
  const [isDragOverDelete, setIsDragOverDelete] = useState(false)
  const [draggedBallId, setDraggedBallId] = useState<number | null>(null)

  // This function handles updating a task's position after being dragged.
  const handleDragEnd = (id: number, newX: number, newY: number) => {
    if (isDragOverDelete) {
      // Delete the ball if it was dropped on the delete button
      setTasks((currentTasks) => currentTasks.filter((task) => task.id !== id))
    } else {
      // Update position normally
      setTasks((currentTasks) => currentTasks.map((task) => (task.id === id ? { ...task, x: newX, y: newY } : task)))
    }
    setIsDragOverDelete(false)
    setDraggedBallId(null)
  }


  // This function adds a new task blob to the canvas.
  const addNewTask = (e: MouseEvent<HTMLButtonElement>) => {
    const newId = Date.now()
    const randomColor = NEW_BALL_COLOR
    const defaultSize = BALL_SIZE

    // Position new blob in the center of the container
    const containerWidth = containerRef.current?.clientWidth || window.innerWidth
    const containerHeight = containerRef.current?.clientHeight || window.innerHeight

    const newTask: Task = {
      id: newId,
      label: "New Task",
      size: defaultSize,
      color: randomColor,
      x: containerWidth / 2 - defaultSize / 2,
      y: containerHeight / 2 - defaultSize / 2,
    }
    setTasks((currentTasks) => [...currentTasks, newTask])
  }

  // Handler for when a rename is requested (right-click)
  const handleRenameRequest = (id: number, currentLabel: string, position: { x: number; y: number }) => {
    setRenameBlobId(id)
    setRenameBlobLabel(currentLabel)
    setRenameBlobPosition(position)
    setShowRenamePrompt(true)
  }

  // Handler for submitting the rename form
  const handleRenameSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (renameBlobId !== null) {
      setTasks((currentTasks) =>
        currentTasks.map((task) => (task.id === renameBlobId ? { ...task, label: renameBlobLabel } : task)),
      )
    }
    setShowRenamePrompt(false)
    setRenameBlobId(null)
    setRenameBlobLabel("")
    setRenameBlobPosition(null)
  }

  // Handler for canceling the rename prompt
  const handleRenameCancel = () => {
    setShowRenamePrompt(false)
    setRenameBlobId(null)
    setRenameBlobLabel("")
    setRenameBlobPosition(null)
  }

  return (
    <div className="relative w-screen h-screen bg-gray-900 overflow-hidden">
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
              onDragStart={() => setDraggedBallId(task.id)}
              onDrag={(newX: number, newY: number) => {
                // Check if dragging over delete button (top-right area)
                const buttonArea = { x: window.innerWidth - 100, y: 0, width: 100, height: 100 }
                const isOverButton = newX > buttonArea.x && newY < buttonArea.height
                setIsDragOverDelete(isOverButton)
              }}
              onRenameRequest={handleRenameRequest}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* UI Controls are kept outside the filtered container to prevent them from being distorted */}
      <div className="absolute top-4 right-4 z-10">
        <Button
          onClick={addNewTask}
          size="lg"
          className={`rounded-full p-4 shadow-lg text-white transition-colors ${
            isDragOverDelete 
              ? "bg-red-500 hover:bg-red-600" 
              : "bg-blue-500 hover:bg-blue-600"
          }`}
        >
          {isDragOverDelete ? (
            <span className="w-6 h-6 text-2xl font-bold">×</span>
          ) : (
            <Plus className="w-6 h-6" />
          )}
          <span className="sr-only">{isDragOverDelete ? "Delete Task" : "Add New Task"}</span>
        </Button>
      </div>
      <div className="absolute bottom-4 left-4 text-white/50 font-sans text-sm z-10">
        <p>
          Drag the balls around. Right-click to rename. Add new ones with the '+' button. Drag to the '+' to delete.
        </p>
      </div>

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
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  handleRenameCancel()
                }
              }}
            />
            <div className="flex gap-2">
              <Button type="submit" className="flex-1 bg-blue-500 hover:bg-blue-600 text-white">
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
  )
}
