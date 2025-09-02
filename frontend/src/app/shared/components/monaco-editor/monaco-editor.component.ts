import { Component, Input, Output, EventEmitter, ViewChild, ElementRef, AfterViewInit, OnDestroy, OnChanges, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MonacoLoaderService } from '../../services/monaco-loader.service';

declare const monaco: any;

@Component({
  selector: 'monaco-editor',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div #editorContainer class="editor-container" [style.height]="height"></div>
  `,
  styles: [`
    .editor-container {
      width: 100%;
      border: 1px solid #e0e0e0;
      border-radius: 4px;
    }
  `]
})
export class MonacoEditorComponent implements AfterViewInit, OnDestroy, OnChanges {
  @ViewChild('editorContainer', { static: true }) editorContainer!: ElementRef;
  @Input() value = '';
  @Input() language = 'json';
  @Input() theme = 'vs-light';
  @Input() readOnly = false;
  @Input() height = '400px';
  @Input() options: any = {};
  @Output() valueChange = new EventEmitter<string>();
  @Output() editorInit = new EventEmitter<any>();
  
  private editor: any = null;
  private isUpdatingValue = false;
  private monacoLoader = inject(MonacoLoaderService);

  async ngAfterViewInit(): Promise<void> {
    await this.monacoLoader.loadMonaco();
    this.initMonaco();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.editor) {
      if (changes['value'] && !changes['value'].firstChange) {
        const newValue = changes['value'].currentValue;
        if (newValue !== this.editor.getValue() && !this.isUpdatingValue) {
          this.editor.setValue(newValue || '');
        }
      }
      
      if (changes['language'] && !changes['language'].firstChange) {
        this.setLanguage(changes['language'].currentValue);
      }
    }
  }

  ngOnDestroy(): void {
    if (this.editor) {
      this.editor.dispose();
    }
  }

  private initMonaco(): void {
    if (!this.editorContainer || typeof monaco === 'undefined') return;
    
    try {
      this.editor = monaco.editor.create(this.editorContainer.nativeElement, {
        value: this.value,
        language: this.language,
        theme: this.theme,
        readOnly: this.readOnly,
        automaticLayout: true,
        minimap: {
          enabled: false
        },
        scrollBeyondLastLine: false,
        fontSize: 14,
        lineNumbers: 'on',
        renderLineHighlight: 'all',
        scrollbar: {
          vertical: 'visible',
          horizontal: 'visible'
        },
        ...this.options
      });
      
      this.editorInit.emit(this.editor);

      this.editor.onDidChangeModelContent(() => {
        if (!this.isUpdatingValue && this.editor) {
          const value = this.editor.getValue();
          this.valueChange.emit(value);
        }
      });
    } catch (error) {
      console.error('Failed to initialize Monaco Editor:', error);
    }
  }

  public setValue(value: string): void {
    if (this.editor) {
      this.isUpdatingValue = true;
      this.editor.setValue(value);
      this.isUpdatingValue = false;
    }
  }

  public getValue(): string {
    return this.editor ? this.editor.getValue() : '';
  }

  public setLanguage(language: string): void {
    if (this.editor) {
      const model = this.editor.getModel();
      if (model) {
        monaco.editor.setModelLanguage(model, language);
      }
    }
  }
}