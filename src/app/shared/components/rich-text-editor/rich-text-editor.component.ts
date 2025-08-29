import { Component, Input, Output, EventEmitter, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';

@Component({
  selector: 'app-rich-text-editor',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatDividerModule
  ],
  template: `
    <div class="rich-text-editor">
      <div class="editor-toolbar" *ngIf="!readonly">
        <button mat-icon-button (click)="formatText('bold')" matTooltip="Bold (Ctrl+B)">
          <mat-icon>format_bold</mat-icon>
        </button>
        <button mat-icon-button (click)="formatText('italic')" matTooltip="Italic (Ctrl+I)">
          <mat-icon>format_italic</mat-icon>
        </button>
        <button mat-icon-button (click)="formatText('underline')" matTooltip="Underline (Ctrl+U)">
          <mat-icon>format_underlined</mat-icon>
        </button>
        
        <mat-divider [vertical]="true"></mat-divider>
        
        <button mat-icon-button (click)="formatText('h1')" matTooltip="Heading 1">
          <span class="text-button">H1</span>
        </button>
        <button mat-icon-button (click)="formatText('h2')" matTooltip="Heading 2">
          <span class="text-button">H2</span>
        </button>
        <button mat-icon-button (click)="formatText('h3')" matTooltip="Heading 3">
          <span class="text-button">H3</span>
        </button>
        
        <mat-divider [vertical]="true"></mat-divider>
        
        <button mat-icon-button (click)="formatText('ul')" matTooltip="Unordered List">
          <mat-icon>format_list_bulleted</mat-icon>
        </button>
        <button mat-icon-button (click)="formatText('ol')" matTooltip="Ordered List">
          <mat-icon>format_list_numbered</mat-icon>
        </button>
        <button mat-icon-button (click)="formatText('code')" matTooltip="Code">
          <mat-icon>code</mat-icon>
        </button>
        <button mat-icon-button (click)="formatText('link')" matTooltip="Insert Link">
          <mat-icon>link</mat-icon>
        </button>
        
        <mat-divider [vertical]="true"></mat-divider>
        
        <button mat-icon-button (click)="togglePreview()" matTooltip="Toggle Preview">
          <mat-icon>{{ showPreview ? 'edit' : 'preview' }}</mat-icon>
        </button>
      </div>
      
      <div class="editor-content">
        <textarea 
          #textEditor
          class="editor-textarea"
          [(ngModel)]="value"
          (ngModelChange)="onChange($event)"
          (blur)="onTouched()"
          [placeholder]="placeholder"
          [readonly]="readonly"
          [style.display]="showPreview ? 'none' : 'block'"
        ></textarea>
        
        <div 
          class="editor-preview markdown-content"
          *ngIf="showPreview"
          [innerHTML]="getPreviewHtml()"
        ></div>
      </div>
      
      <div class="editor-footer">
        <span class="char-count">{{ value?.length || 0 }} characters</span>
        <span class="markdown-hint" *ngIf="!showPreview">Supports Markdown formatting</span>
      </div>
    </div>
  `,
  styles: [`
    .rich-text-editor {
      border: 1px solid rgba(0, 0, 0, 0.12);
      border-radius: 4px;
      overflow: hidden;
    }
    
    .editor-toolbar {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 8px;
      background: #f5f5f5;
      border-bottom: 1px solid rgba(0, 0, 0, 0.12);
      
      mat-divider {
        height: 24px;
        margin: 0 4px;
      }
      
      .text-button {
        font-weight: bold;
        font-size: 14px;
      }
    }
    
    .editor-content {
      min-height: 150px;
      max-height: 400px;
      overflow-y: auto;
      
      .editor-textarea {
        width: 100%;
        min-height: 150px;
        padding: 12px;
        border: none;
        resize: vertical;
        font-family: inherit;
        font-size: 14px;
        line-height: 1.5;
        outline: none;
      }
      
      .editor-preview {
        padding: 12px;
        min-height: 150px;
      }
    }
    
    .editor-footer {
      display: flex;
      justify-content: space-between;
      padding: 8px 12px;
      background: #f5f5f5;
      border-top: 1px solid rgba(0, 0, 0, 0.12);
      font-size: 12px;
      color: #666;
    }
    
    .markdown-content {
      h1 { font-size: 24px; margin: 16px 0 8px; }
      h2 { font-size: 20px; margin: 14px 0 6px; }
      h3 { font-size: 16px; margin: 12px 0 4px; }
      p { margin: 8px 0; }
      ul, ol { margin: 8px 0; padding-left: 20px; }
      code { 
        background: #f5f5f5; 
        padding: 2px 4px; 
        border-radius: 3px;
        font-family: 'Courier New', monospace;
      }
      pre {
        background: #f5f5f5;
        padding: 12px;
        border-radius: 4px;
        overflow-x: auto;
      }
      a { color: #1976d2; text-decoration: none; }
      a:hover { text-decoration: underline; }
      strong { font-weight: bold; }
      em { font-style: italic; }
    }
  `],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => RichTextEditorComponent),
      multi: true
    }
  ]
})
export class RichTextEditorComponent implements ControlValueAccessor {
  @Input() placeholder = 'Enter text...';
  @Input() readonly = false;
  
  value = '';
  showPreview = false;
  
  onChange: (value: string) => void = () => {};
  onTouched: () => void = () => {};
  
  writeValue(value: string): void {
    this.value = value || '';
  }
  
  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }
  
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }
  
  setDisabledState(isDisabled: boolean): void {
    this.readonly = isDisabled;
  }
  
  formatText(format: string): void {
    const textarea = document.querySelector('.editor-textarea') as HTMLTextAreaElement;
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = this.value.substring(start, end);
    let formattedText = '';
    
    switch (format) {
      case 'bold':
        formattedText = `**${selectedText}**`;
        break;
      case 'italic':
        formattedText = `*${selectedText}*`;
        break;
      case 'underline':
        formattedText = `<u>${selectedText}</u>`;
        break;
      case 'h1':
        formattedText = `# ${selectedText}`;
        break;
      case 'h2':
        formattedText = `## ${selectedText}`;
        break;
      case 'h3':
        formattedText = `### ${selectedText}`;
        break;
      case 'ul':
        formattedText = `- ${selectedText}`;
        break;
      case 'ol':
        formattedText = `1. ${selectedText}`;
        break;
      case 'code':
        formattedText = selectedText.includes('\n') 
          ? `\`\`\`\n${selectedText}\n\`\`\`` 
          : `\`${selectedText}\``;
        break;
      case 'link':
        const url = prompt('Enter URL:');
        if (url) {
          formattedText = `[${selectedText || 'Link text'}](${url})`;
        } else {
          return;
        }
        break;
      default:
        formattedText = selectedText;
    }
    
    this.value = this.value.substring(0, start) + formattedText + this.value.substring(end);
    this.onChange(this.value);
    
    // Restore focus and selection
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + formattedText.length, start + formattedText.length);
    }, 0);
  }
  
  togglePreview(): void {
    this.showPreview = !this.showPreview;
  }
  
  getPreviewHtml(): string {
    // Simple markdown to HTML conversion
    let html = this.value || '';
    
    // Headers
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
    
    // Bold
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    
    // Italic
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    
    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
    
    // Code blocks
    html = html.replace(/```([^`]+)```/g, '<pre><code>$1</code></pre>');
    
    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    
    // Lists
    html = html.replace(/^\* (.+)$/gim, '<li>$1</li>');
    html = html.replace(/^- (.+)$/gim, '<li>$1</li>');
    html = html.replace(/^\d+\. (.+)$/gim, '<li>$1</li>');
    
    // Wrap lists
    html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
    
    // Line breaks
    html = html.replace(/\n/g, '<br>');
    
    return html;
  }
}