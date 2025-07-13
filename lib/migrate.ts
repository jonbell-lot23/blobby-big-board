import { storage, type Task, type Context } from './storage';

export class DataMigration {
  static async migrateLocalStorageToCloud(): Promise<{ success: boolean; message: string }> {
    try {
      const homeData = storage.loadLocalStorageTasks("Home");
      const workData = storage.loadLocalStorageTasks("Work");

      if (homeData.length === 0 && workData.length === 0) {
        return { success: true, message: "No local data found to migrate" };
      }

      // Get user's boards
      const boards = await storage.getBoards();
      const homeBoard = boards.find(b => b.name === "Home");
      const workBoard = boards.find(b => b.name === "Work");

      if (!homeBoard || !workBoard) {
        return { success: false, message: "User boards not found. Please ensure you're logged in." };
      }

      let migratedCount = 0;

      // Migrate Home tasks
      for (const task of homeData) {
        try {
          await storage.createTask(homeBoard.id, {
            label: task.label,
            x: task.x,
            y: task.y,
            size: task.size
          });
          migratedCount++;
        } catch (error) {
          console.error('Error migrating home task:', task, error);
        }
      }

      // Migrate Work tasks
      for (const task of workData) {
        try {
          await storage.createTask(workBoard.id, {
            label: task.label,
            x: task.x,
            y: task.y,
            size: task.size
          });
          migratedCount++;
        } catch (error) {
          console.error('Error migrating work task:', task, error);
        }
      }

      // Clear localStorage after successful migration
      if (migratedCount > 0) {
        storage.clearLocalStorage();
      }

      return { 
        success: true, 
        message: `Successfully migrated ${migratedCount} tasks to cloud storage` 
      };

    } catch (error) {
      console.error('Migration error:', error);
      return { 
        success: false, 
        message: `Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  static hasLocalStorageData(): boolean {
    if (typeof window === 'undefined') return false;
    
    const homeData = localStorage.getItem('circles-home');
    const workData = localStorage.getItem('circles-work');
    const legacyData = localStorage.getItem('circles');
    
    return !!(homeData || workData || legacyData);
  }
}