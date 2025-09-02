import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class MonacoLoaderService {
  private monacoLoaded = false;

  public async loadMonaco(): Promise<void> {
    if (this.monacoLoaded) {
      return;
    }

    // Configure Monaco editor loader
    const monacoRequire = (window as any).require;
    
    if (!monacoRequire) {
      await this.loadMonacoScript();
    }

    this.monacoLoaded = true;
  }

  private loadMonacoScript(): Promise<void> {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.type = 'text/javascript';
      script.src = 'assets/monaco-editor/min/vs/loader.js';
      script.onload = () => {
        (window as any).require.config({ 
          paths: { 
            'vs': 'assets/monaco-editor/min/vs' 
          } 
        });
        
        (window as any).require(['vs/editor/editor.main'], () => {
          resolve();
        });
      };
      document.body.appendChild(script);
    });
  }
}