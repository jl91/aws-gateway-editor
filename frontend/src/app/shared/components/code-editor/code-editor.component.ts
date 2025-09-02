import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'code-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="editor-wrapper">
      <div class="editor-header" *ngIf="showHeader">
        <span class="language-badge">{{ language.toUpperCase() }}</span>
        <span class="line-info">Lines: {{ lineCount }}</span>
      </div>
      <textarea
        [(ngModel)]="internalValue"
        [readonly]="readOnly"
        [style.height]="height"
        class="code-editor"
        (ngModelChange)="onValueChange()"
        spellcheck="false"
      ></textarea>
    </div>
  `,
  styles: [`
    .editor-wrapper {
      border: 1px solid #e0e0e0;
      border-radius: 4px;
      overflow: hidden;
      background: white;
    }
    
    .editor-header {
      display: flex;
      justify-content: space-between;
      padding: 8px 12px;
      background: #f5f5f5;
      border-bottom: 1px solid #e0e0e0;
      font-size: 12px;
      color: #666;
    }
    
    .language-badge {
      font-weight: 500;
      color: #1976d2;
    }
    
    .code-editor {
      width: 100%;
      border: none;
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
      font-size: 13px;
      line-height: 1.5;
      padding: 12px;
      resize: none;
      outline: none;
      background: white;
      color: #333;
      tab-size: 2;
      white-space: pre;
      overflow: auto;
    }
    
    .code-editor:read-only {
      background: #fafafa;
      cursor: not-allowed;
    }
  `]
})
export class CodeEditorComponent implements OnChanges {
  @Input() value = '';
  @Input() language = 'json';
  @Input() readOnly = false;
  @Input() height = '400px';
  @Input() showHeader = true;
  @Output() valueChange = new EventEmitter<string>();
  
  internalValue = '';
  lineCount = 0;
  
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['value']) {
      this.internalValue = this.value || '';
      this.updateLineCount();
    }
  }
  
  onValueChange(): void {
    this.valueChange.emit(this.internalValue);
    this.updateLineCount();
  }
  
  private updateLineCount(): void {
    this.lineCount = this.internalValue ? this.internalValue.split('\n').length : 0;
  }
}