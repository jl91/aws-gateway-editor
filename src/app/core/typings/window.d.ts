interface ElectronAPI {
  selectDirectory(): Promise<string>;
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  exists(path: string): Promise<boolean>;
  listFiles(path: string): Promise<string[]>;
  getGitStatus(path: string): Promise<any>;
  createCommit(path: string, message: string): Promise<void>;
  push(path: string): Promise<void>;
  pull(path: string): Promise<void>;
}

interface Window {
  electronAPI?: ElectronAPI;
}