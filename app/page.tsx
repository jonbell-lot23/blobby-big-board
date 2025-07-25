"use client";

import type React from "react";
import { useState, useRef, useEffect, type MouseEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth, useUser, SignInButton } from "@clerk/nextjs";
import TaskBlob from "@/components/task-blob";
import GooeyFilter from "@/components/gooey-filter";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { hyphenateText } from "@/lib/utils";
import { storage, type Task, type Context, type Board } from "@/lib/storage";
import { DataMigration } from "@/lib/migrate";

// Standard size for all balls
const BALL_SIZE = 100;

export default function CloudBlobbyTrackerPage() {
  const { isLoaded: authLoaded, userId, isSignedIn } = useAuth();
  const { user } = useUser();
  
  const [currentContext, setCurrentContext] = useState<Context>(() => {
    // Remember last tab from localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('blobby-current-context');
      if (saved === 'Home' || saved === 'Work') {
        return saved;
      }
    }
    return "Home";
  });
  const [tasks, setTasks] = useState<Task[]>([]);
  const [boards, setBoards] = useState<Board[]>([]);
  const [currentBoard, setCurrentBoard] = useState<Board | null>(null);
  const [allBoardTasks, setAllBoardTasks] = useState<Record<string, Task[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [showMigrationPrompt, setShowMigrationPrompt] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);

  // UI state
  const [showRenamePrompt, setShowRenamePrompt] = useState(false);
  const [renameBlobId, setRenameBlobId] = useState<string | null>(null);
  const [renameBlobLabel, setRenameBlobLabel] = useState("");
  const [renameBlobPosition, setRenameBlobPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showCreateRenamePrompt, setShowCreateRenamePrompt] = useState(false);
  const [createRenameLabel, setCreateRenameLabel] = useState("Project Name");
  const [pendingNewTask, setPendingNewTask] = useState<Omit<Task, 'id'> | null>(null);
  const [showCreateContextMenu, setShowCreateContextMenu] = useState(false);
  const [createContextMenuPosition, setCreateContextMenuPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  // Add keyboard shortcut for creating new tasks
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.key === "n" || e.key === "N") &&
        !e.repeat &&
        !e.metaKey &&
        !e.ctrlKey &&
        document.activeElement &&
        document.activeElement.tagName !== "INPUT" &&
        document.activeElement.tagName !== "TEXTAREA" &&
        isSignedIn &&
        currentBoard
      ) {
        e.preventDefault();
        handleCreateNewBall();
      }
    };
    
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSignedIn, currentBoard]);

  // Initialize user and load data
  useEffect(() => {
    async function initializeUser() {
      if (!authLoaded) return;

      try {
        setIsLoading(true);
        setError(null);

        // Only initialize database if signed in
        if (isSignedIn && user) {
          // Ensure user exists in database
          await storage.ensureUser(
            user.username || user.firstName || 'user',
            user.primaryEmailAddress?.emailAddress || ''
          );

          // Load boards
          const userBoards = await storage.getBoards();
          setBoards(userBoards);

          // Preload tasks for ALL boards for instant switching
          const boardTasksMap: Record<string, Task[]> = {};
          for (const board of userBoards) {
            boardTasksMap[board.id] = board.tasks;
          }
          setAllBoardTasks(boardTasksMap);

          // Set current board
          const homeBoard = userBoards.find(b => b.name === currentContext);
          if (homeBoard) {
            setCurrentBoard(homeBoard);
            setTasks(homeBoard.tasks);
          }

          // Check for local storage data to migrate
          if (DataMigration.hasLocalStorageData()) {
            setShowMigrationPrompt(true);
          }
        }
      } catch (err) {
        console.error('Error initializing user:', err);
        setError('Failed to load data');
      } finally {
        setIsLoading(false);
      }
    }

    initializeUser();
  }, [authLoaded, isSignedIn, user, currentContext]);

  // Handle context switching - instant with preloaded data
  const handleContextSwitch = (newContext: Context) => {
    if (newContext === currentContext) return;

    // Save tab selection to localStorage
    localStorage.setItem('blobby-current-context', newContext);

    // Instant switch using preloaded data
    setCurrentContext(newContext);
    const board = boards.find(b => b.name === newContext);
    if (board) {
      setCurrentBoard(board);
      const preloadedTasks = allBoardTasks[board.id] || [];
      setTasks(preloadedTasks);
    }
  };

  // Handle drag end with optimistic update
  const handleDragEnd = async (id: string, newX: number, newY: number) => {
    // Optimistically update UI immediately
    setTasks(prev => prev.map(task => 
      task.id === id ? { ...task, x: newX, y: newY } : task
    ));
    
    // Update preloaded cache
    if (currentBoard) {
      setAllBoardTasks(prev => ({
        ...prev,
        [currentBoard.id]: prev[currentBoard.id]?.map(task => 
          task.id === id ? { ...task, x: newX, y: newY } : task
        ) || []
      }));
    }

    // Save to database in background - fail silently
    try {
      await storage.updateTask(id, { x: newX, y: newY });
    } catch (err) {
      console.error('Error updating task position:', err);
      // Fail silently - user's drag already worked in the UI
    }
  };

  // Handle creating new task - show ball immediately
  const handleCreateNewBall = () => {
    if (!currentBoard) return;

    const containerWidth = containerRef.current?.clientWidth || window.innerWidth;
    const containerHeight = containerRef.current?.clientHeight || window.innerHeight;

    let newX: number;
    let newY: number;

    if (tasks.length > 0) {
      const lastTask = tasks[tasks.length - 1];
      newX = lastTask.x + 40;
      newY = lastTask.y + 40;
      newX = Math.min(newX, containerWidth - BALL_SIZE);
      newY = Math.min(newY, containerHeight - BALL_SIZE);
    } else if (containerWidth < 768) {
      newX = containerWidth / 2 - BALL_SIZE / 2;
      newY = containerHeight / 2 - BALL_SIZE / 2;
    } else {
      newX = containerWidth / 4 - BALL_SIZE / 2;
      newY = containerHeight / 2 - BALL_SIZE / 2;
    }

    const newTask = {
      label: "Project Name",
      size: BALL_SIZE,
      x: newX,
      y: newY,
    };

    // Generate temporary ID and show ball immediately
    const tempId = `temp-${Date.now()}`;
    const immediateTask = { ...newTask, id: tempId };
    
    // Show ball immediately
    setTasks(prev => [...prev, immediateTask]);
    setAllBoardTasks(prev => ({
      ...prev,
      [currentBoard.id]: [...(prev[currentBoard.id] || []), immediateTask]
    }));

    setPendingNewTask(newTask);
    setCreateRenameLabel("Project Name");
    setShowCreateRenamePrompt(true);
  };

  // Handle create rename submit with optimistic update
  const handleCreateRenameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingNewTask || !currentBoard) return;

    const finalTask = { ...pendingNewTask, label: createRenameLabel };
    
    // Find the temp task that was already shown
    const tempTask = tasks.find(task => task.id.startsWith('temp-') && task.label === 'Project Name');
    const tempId = tempTask?.id || `temp-${Date.now()}`;
    
    // Update the existing temp task with the new label
    setTasks(prev => prev.map(task => 
      task.id === tempId ? { ...task, label: createRenameLabel } : task
    ));
    setAllBoardTasks(prev => ({
      ...prev,
      [currentBoard.id]: prev[currentBoard.id]?.map(task => 
        task.id === tempId ? { ...task, label: createRenameLabel } : task
      ) || []
    }));
    
    // Close dialog immediately
    setShowCreateRenamePrompt(false);
    setPendingNewTask(null);
    setCreateRenameLabel("Project Name");

    // Save to database in background
    try {
      const createdTask = await storage.createTask(currentBoard.id, finalTask);
      
      // Replace temporary task with real task
      setTasks(prev => prev.map(task => 
        task.id === tempId ? createdTask : task
      ));
      setAllBoardTasks(prev => ({
        ...prev,
        [currentBoard.id]: prev[currentBoard.id]?.map(task => 
          task.id === tempId ? createdTask : task
        ) || []
      }));
    } catch (err) {
      console.error('Error creating task:', err);
      // Remove optimistic task on error
      setTasks(prev => prev.filter(task => task.id !== tempId));
      setAllBoardTasks(prev => ({
        ...prev,
        [currentBoard.id]: prev[currentBoard.id]?.filter(task => task.id !== tempId) || []
      }));
      setError('Failed to create task');
    }
  };

  // Handle delete task with optimistic update
  const handleDeleteTask = async (id: string) => {
    // Store task for potential rollback
    const taskToDelete = tasks.find(task => task.id === id);
    
    // Optimistically remove task immediately
    setTasks(prev => prev.filter(task => task.id !== id));
    
    // Update preloaded cache
    if (currentBoard) {
      setAllBoardTasks(prev => ({
        ...prev,
        [currentBoard.id]: prev[currentBoard.id]?.filter(task => task.id !== id) || []
      }));
    }
    
    // Close rename dialog
    setShowRenamePrompt(false);
    setRenameBlobId(null);
    setRenameBlobLabel("");
    setRenameBlobPosition(null);

    // Delete from database in background
    try {
      await storage.deleteTask(id);
    } catch (err) {
      console.error('Error deleting task:', err);
      // Restore task on error
      if (taskToDelete && currentBoard) {
        setTasks(prev => [...prev, taskToDelete]);
        setAllBoardTasks(prev => ({
          ...prev,
          [currentBoard.id]: [...(prev[currentBoard.id] || []), taskToDelete]
        }));
      }
      setError('Failed to delete task');
    }
  };

  // Handle rename request
  const handleRenameRequest = (
    id: string,
    currentLabel: string,
    position: { x: number; y: number }
  ) => {
    setRenameBlobId(id);
    setRenameBlobLabel(currentLabel);
    setRenameBlobPosition(position);
    setShowRenamePrompt(true);
  };

  // Handle rename submit with optimistic update
  const handleRenameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameBlobId) return;

    // Store old label for potential rollback
    const oldTask = tasks.find(task => task.id === renameBlobId);
    const oldLabel = oldTask?.label || '';

    // Optimistically update label immediately
    setTasks(prev => prev.map(task =>
      task.id === renameBlobId ? { ...task, label: renameBlobLabel } : task
    ));
    
    // Update preloaded cache
    if (currentBoard) {
      setAllBoardTasks(prev => ({
        ...prev,
        [currentBoard.id]: prev[currentBoard.id]?.map(task => 
          task.id === renameBlobId ? { ...task, label: renameBlobLabel } : task
        ) || []
      }));
    }
    
    // Close dialog immediately
    setShowRenamePrompt(false);
    setRenameBlobId(null);
    setRenameBlobLabel("");
    setRenameBlobPosition(null);

    // Save to database in background
    try {
      await storage.updateTask(renameBlobId, { label: renameBlobLabel });
    } catch (err) {
      console.error('Error renaming task:', err);
      // Revert optimistic update on error
      setTasks(prev => prev.map(task =>
        task.id === renameBlobId ? { ...task, label: oldLabel } : task
      ));
      if (currentBoard) {
        setAllBoardTasks(prev => ({
          ...prev,
          [currentBoard.id]: prev[currentBoard.id]?.map(task => 
            task.id === renameBlobId ? { ...task, label: oldLabel } : task
          ) || []
        }));
      }
      setError('Failed to rename task');
    }
  };

  // Handle clear all with optimistic update
  const handleClearAll = async () => {
    // Store tasks for potential rollback
    const tasksToDelete = [...tasks];
    
    // Optimistically clear immediately
    setTasks([]);
    setShowClearConfirm(false);
    
    // Update preloaded cache
    if (currentBoard) {
      setAllBoardTasks(prev => ({
        ...prev,
        [currentBoard.id]: []
      }));
    }

    // Delete from database in background
    try {
      await Promise.all(tasksToDelete.map(task => storage.deleteTask(task.id)));
    } catch (err) {
      console.error('Error clearing tasks:', err);
      // Restore tasks on error
      setTasks(tasksToDelete);
      if (currentBoard) {
        setAllBoardTasks(prev => ({
          ...prev,
          [currentBoard.id]: tasksToDelete
        }));
      }
      setError('Failed to clear tasks');
    }
  };

  // Handle migration
  const handleMigration = async () => {
    try {
      setIsMigrating(true);
      const result = await DataMigration.migrateLocalStorageToCloud();
      
      if (result.success) {
        // Refresh data after migration
        const userBoards = await storage.getBoards();
        setBoards(userBoards);
        const currentBoardData = userBoards.find(b => b.name === currentContext);
        if (currentBoardData) {
          setCurrentBoard(currentBoardData);
          setTasks(currentBoardData.tasks);
        }
      } else {
        setError(result.message);
      }
      
      setShowMigrationPrompt(false);
    } catch (err) {
      console.error('Migration error:', err);
      setError('Migration failed');
    } finally {
      setIsMigrating(false);
    }
  };

  // Loading state
  if (!authLoaded || isLoading) {
    return (
      <div className="w-screen h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  // Not signed in - show original design with sign-in button
  if (!isSignedIn) {
    return (
      <div className="relative w-screen h-screen overflow-hidden">
        {/* Sign In Button - Top Right */}
        <div className="absolute top-4 right-4 z-50">
          <SignInButton mode="modal">
            <Button className="bg-black hover:bg-gray-800 text-white font-medium px-4 py-2">
              Sign up or log in
            </Button>
          </SignInButton>
        </div>

        {/* Context Toggle - Home/Work */}
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20">
          <div className="flex bg-white/20 backdrop-blur-sm rounded-full p-1 shadow-lg">
            <button className="px-6 py-2 rounded-full text-sm font-medium bg-white text-gray-800">
              Home
            </button>
            <button className="px-6 py-2 rounded-full text-sm font-medium text-gray-300 hover:text-gray-500 hover:bg-gray-100/50">
              Work
            </button>
          </div>
        </div>

        {/* Gooey filter for blob effects */}
        <GooeyFilter />

        {/* Dotted background pattern for desktop only */}
        <div className="hidden md:block absolute inset-0 -z-20 w-full h-full bg-dot-pattern" />

        {/* Background: Desktop circles only */}
        <div className="pointer-events-none absolute inset-0 -z-10 w-full h-full">
          <div className="hidden md:block">
            <div className="absolute left-0 top-1/2 w-[480px] h-[480px] rounded-full bg-zone-mint transform -translate-x-1/2 -translate-y-1/2" />
            <div className="absolute left-1/2 top-1/2 w-[625px] h-[625px] rounded-full bg-zone-sky transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
              <div className="w-[312px] h-[312px] rounded-full bg-blue-400" />
            </div>
            <div className="absolute right-0 top-0 w-[480px] h-[480px] rounded-full bg-yellow-100 transform translate-x-1/3 -translate-y-1/4" />
            <div className="absolute right-0 bottom-0 w-[480px] h-[480px] rounded-full bg-zone-gray transform translate-x-1/3 translate-y-1/4" />
          </div>
        </div>

        {/* Circular Create New Button (disabled when not signed in) */}
        <div className="absolute top-4 left-4 z-10">
          <button 
            disabled
            className="w-12 h-12 rounded-full bg-transparent text-gray-400 border-2 border-gray-400 p-0 flex items-center justify-center opacity-50 cursor-not-allowed"
          >
            <Plus size={20} />
          </button>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="w-screen h-screen flex items-center justify-center">
        <div className="text-lg text-red-500">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="relative w-screen h-screen overflow-hidden">
      {/* Context Toggle - Home/Work */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20">
        <div className="flex bg-white/20 backdrop-blur-sm rounded-full p-1 shadow-lg">
          <button
            onClick={() => handleContextSwitch("Home")}
            className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
              currentContext === "Home"
                ? "bg-white text-gray-800"
                : " text-gray-300 hover:text-gray-500 hover:bg-gray-100/50"
            }`}
          >
            Home
          </button>
          <button
            onClick={() => handleContextSwitch("Work")}
            className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
              currentContext === "Work"
                ? "bg-white text-gray-800"
                : " text-gray-300 hover:text-gray-500 hover:bg-gray-100/50"
            }`}
          >
            Work
          </button>
        </div>
      </div>

      {/* Gooey filter for blob effects */}
      <GooeyFilter />

      {/* Background elements (same as original) */}
      <div className="hidden md:block absolute inset-0 -z-20 w-full h-full bg-dot-pattern" />
      
      <div className="pointer-events-none absolute inset-0 -z-10 w-full h-full">
        <div className="hidden md:block">
          <div className="absolute left-0 top-1/2 w-[480px] h-[480px] rounded-full bg-zone-mint transform -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute left-1/2 top-1/2 w-[625px] h-[625px] rounded-full bg-zone-sky transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
            <div className="w-[312px] h-[312px] rounded-full bg-blue-400" />
          </div>
          <div className="absolute right-0 top-0 w-[480px] h-[480px] rounded-full bg-yellow-100 transform translate-x-1/3 -translate-y-1/4" />
          <div className="absolute right-0 bottom-0 w-[480px] h-[480px] rounded-full bg-zone-gray transform translate-x-1/3 translate-y-1/4" />
        </div>
      </div>

      {/* Desktop: Draggable balls */}
      <div ref={containerRef} className="hidden md:block relative w-full h-full">
        <AnimatePresence>
          {tasks.map((task) => (
            <TaskBlob
              key={task.id}
              id={task.id}
              label={task.label}
              size={BALL_SIZE}
              color="#000000"
              initialPosition={{ x: task.x, y: task.y }}
              dragConstraintsRef={containerRef}
              onDragEnd={(id, x, y) => handleDragEnd(String(id), x, y)}
              onRenameRequest={(id, currentLabel, position) => handleRenameRequest(String(id), currentLabel, position)}
              onDeleteRequest={(id) => handleDeleteTask(String(id))}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Create Button */}
      <div className="absolute top-4 left-4 z-10">
        <button
          onClick={handleCreateNewBall}
          disabled={isCreatingNew}
          className="w-12 h-12 rounded-full bg-transparent hover:bg-gray-100 text-black border-2 border-black p-0 flex items-center justify-center cursor-pointer disabled:opacity-50"
        >
          <Plus size={20} />
        </button>
      </div>

      {/* Create Rename Prompt */}
      {showCreateRenamePrompt && (
        <div className="absolute p-4 rounded-lg shadow-xl z-50 max-w-xs md:max-w-none border border-black bg-white text-black"
          style={{
            left: window.innerWidth < 768 ? 16 : 80,
            top: window.innerWidth < 768 ? 80 : 20,
            right: window.innerWidth < 768 ? 16 : "auto",
          }}
        >
          <form onSubmit={handleCreateRenameSubmit} className="flex flex-col gap-2">
            <input
              type="text"
              value={createRenameLabel}
              onChange={(e) => setCreateRenameLabel(e.target.value)}
              className="p-2 rounded border border-black bg-white text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Project name"
              autoFocus
              onFocus={(e) => e.target.select()}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setShowCreateRenamePrompt(false);
                  setPendingNewTask(null);
                }
              }}
            />
            <div className="flex gap-2">
              <Button
                type="submit"
                disabled={isCreatingNew}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white border-0"
              >
                {isCreatingNew ? "Creating..." : "Create"}
              </Button>
              <Button
                type="button"
                onClick={() => {
                  // Remove the temporary ball when canceling
                  const tempTask = tasks.find(task => task.id.startsWith('temp-') && task.label === 'Project Name');
                  if (tempTask && currentBoard) {
                    setTasks(prev => prev.filter(task => task.id !== tempTask.id));
                    setAllBoardTasks(prev => ({
                      ...prev,
                      [currentBoard.id]: prev[currentBoard.id]?.filter(task => task.id !== tempTask.id) || []
                    }));
                  }
                  setShowCreateRenamePrompt(false);
                  setPendingNewTask(null);
                }}
                className="flex-1 bg-gray-500 hover:bg-gray-600 text-white border-0"
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Rename Prompt */}
      {showRenamePrompt && renameBlobPosition && (
        <div
          className="absolute bg-gray-700 p-4 rounded-lg shadow-xl z-50"
          style={{
            left: renameBlobPosition.x,
            top: renameBlobPosition.y,
            transform: "translate(-50%, -50%)",
          }}
        >
          <button
            onClick={() => renameBlobId && handleDeleteTask(renameBlobId)}
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
                  setShowRenamePrompt(false);
                  setRenameBlobId(null);
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
                onClick={() => {
                  setShowRenamePrompt(false);
                  setRenameBlobId(null);
                }}
                className="flex-1 bg-gray-500 hover:bg-gray-600 text-white"
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Migration Prompt */}
      {showMigrationPrompt && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md mx-4">
            <h3 className="text-gray-800 text-lg font-bold mb-4">
              Migrate Local Data
            </h3>
            <p className="text-gray-600 mb-6">
              We found existing tasks saved locally in your browser. Would you like to migrate them to cloud storage so you can access them from any device?
            </p>
            <div className="flex gap-3">
              <Button
                onClick={handleMigration}
                disabled={isMigrating}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isMigrating ? "Migrating..." : "Migrate Data"}
              </Button>
              <Button
                onClick={() => setShowMigrationPrompt(false)}
                variant="outline"
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 border-gray-300"
              >
                Skip
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}