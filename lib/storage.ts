export type Task = {
  id: string;
  label: string;
  size: number;
  x: number;
  y: number;
};

export type Board = {
  id: string;
  name: string;
  tasks: Task[];
};

export type Context = "Home" | "Work";

class StorageService {
  private apiCache = new Map();
  
  async getUserData() {
    try {
      const response = await fetch('/api/user');
      if (!response.ok) throw new Error('Failed to fetch user data');
      const data = await response.json();
      return data.user;
    } catch (error) {
      console.error('Error fetching user data:', error);
      throw error;
    }
  }

  async ensureUser(username: string, email: string) {
    try {
      const response = await fetch('/api/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email })
      });
      if (!response.ok) throw new Error('Failed to create/update user');
      const data = await response.json();
      return data.user;
    } catch (error) {
      console.error('Error creating/updating user:', error);
      throw error;
    }
  }

  async getBoards(): Promise<Board[]> {
    try {
      const response = await fetch('/api/boards');
      if (!response.ok) throw new Error('Failed to fetch boards');
      const data = await response.json();
      return data.boards;
    } catch (error) {
      console.error('Error fetching boards:', error);
      throw error;
    }
  }

  async getBoardByName(name: Context): Promise<Board | null> {
    const boards = await this.getBoards();
    return boards.find(board => board.name === name) || null;
  }

  async getTasks(boardId: string): Promise<Task[]> {
    try {
      const response = await fetch(`/api/tasks?boardId=${boardId}`);
      if (!response.ok) throw new Error('Failed to fetch tasks');
      const data = await response.json();
      return data.tasks;
    } catch (error) {
      console.error('Error fetching tasks:', error);
      throw error;
    }
  }

  async createTask(boardId: string, task: Omit<Task, 'id'>): Promise<Task> {
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ boardId, ...task })
      });
      if (!response.ok) throw new Error('Failed to create task');
      const data = await response.json();
      return data.task;
    } catch (error) {
      console.error('Error creating task:', error);
      throw error;
    }
  }

  async updateTask(id: string, updates: Partial<Omit<Task, 'id'>>): Promise<Task> {
    try {
      const response = await fetch('/api/tasks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates })
      });
      if (!response.ok) throw new Error('Failed to update task');
      const data = await response.json();
      return data.task;
    } catch (error) {
      console.error('Error updating task:', error);
      throw error;
    }
  }

  async deleteTask(id: string): Promise<void> {
    try {
      const response = await fetch(`/api/tasks?id=${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete task');
    } catch (error) {
      console.error('Error deleting task:', error);
      throw error;
    }
  }

  // Legacy localStorage methods for migration
  loadLocalStorageTasks(context: Context): Task[] {
    if (typeof window === 'undefined') return [];
    
    try {
      const key = context === "Home" ? "circles-home" : "circles-work";
      const saved = localStorage.getItem(key);
      
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.map((task: any) => ({
          id: task.id?.toString() || Date.now().toString(),
          label: task.label || '',
          x: task.x || 0,
          y: task.y || 0,
          size: task.size || 100
        }));
      }
      
      // Return default tasks for Home context
      if (context === "Home") {
        return [
          { id: "1", label: "Circle 1", x: 100, y: 100, size: 100 },
          { id: "2", label: "Circle 2", x: 300, y: 200, size: 100 },
          { id: "3", label: "Circle 3", x: 500, y: 150, size: 100 }
        ];
      }
      
      return [];
    } catch (error) {
      console.error('Error loading localStorage tasks:', error);
      return [];
    }
  }

  clearLocalStorage() {
    if (typeof window === 'undefined') return;
    
    localStorage.removeItem('circles-home');
    localStorage.removeItem('circles-work');
    localStorage.removeItem('blobby-current-context');
  }
}

export const storage = new StorageService();