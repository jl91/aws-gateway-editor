import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { CodeEditorComponent } from '../../shared/components/code-editor/code-editor.component';
import { OpenAPIDocument } from '../../core/services/openapi.service';
import * as yaml from 'js-yaml';

export interface ContractPreviewData {
  document: OpenAPIDocument;
  originalDocument?: OpenAPIDocument;
  readOnly?: boolean;
}

@Component({
  selector: 'app-contract-preview',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatTooltipModule,
    MatSnackBarModule,
    MatButtonToggleModule,
    MatFormFieldModule,
    MatInputModule,
    FormsModule,
    CodeEditorComponent
  ],
  templateUrl: './contract-preview.component.html',
  styleUrls: ['./contract-preview.component.scss']
})
export class ContractPreviewComponent implements OnInit {
  format: 'json' | 'yaml' = 'yaml';
  content = '';
  originalContent = '';
  showDiff = false;
  fullscreen = false;
  searchTerm = '';
  hasChanges = false;
  lineCount = 0;
  selectedText = '';
  cursorPosition = { line: 1, column: 1 };
  
  constructor(
    public dialogRef: MatDialogRef<ContractPreviewComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ContractPreviewData,
    private snackBar: MatSnackBar
  ) {}
  
  ngOnInit(): void {
    this.loadContent();
    if (this.data.originalDocument) {
      this.loadOriginalContent();
    }
  }
  
  private loadContent(): void {
    if (this.format === 'yaml') {
      this.content = yaml.dump(this.data.document, {
        indent: 2,
        lineWidth: -1,
        noRefs: true,
        sortKeys: false
      });
    } else {
      this.content = JSON.stringify(this.data.document, null, 2);
    }
    this.updateLineCount();
  }
  
  private loadOriginalContent(): void {
    if (!this.data.originalDocument) return;
    
    if (this.format === 'yaml') {
      this.originalContent = yaml.dump(this.data.originalDocument, {
        indent: 2,
        lineWidth: -1,
        noRefs: true,
        sortKeys: false
      });
    } else {
      this.originalContent = JSON.stringify(this.data.originalDocument, null, 2);
    }
  }
  
  onFormatChange(): void {
    this.loadContent();
    if (this.data.originalDocument) {
      this.loadOriginalContent();
    }
  }
  
  onContentChange(newContent: string): void {
    this.content = newContent;
    this.hasChanges = true;
    this.updateLineCount();
  }
  
  
  toggleDiff(): void {
    if (!this.data.originalDocument) {
      this.snackBar.open('No original document to compare', 'Close', { duration: 2000 });
      return;
    }
    this.showDiff = !this.showDiff;
  }
  
  toggleFullscreen(): void {
    this.fullscreen = !this.fullscreen;
    if (this.fullscreen && document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen();
    } else if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  }
  
  async copyToClipboard(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.content);
      this.snackBar.open('Copied to clipboard', 'Close', { duration: 2000 });
    } catch (error) {
      this.snackBar.open('Failed to copy to clipboard', 'Close', { duration: 2000 });
    }
  }
  
  downloadContract(): void {
    const blob = new Blob([this.content], { 
      type: this.format === 'yaml' ? 'text/yaml' : 'application/json' 
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `openapi.${this.format}`;
    link.click();
    window.URL.revokeObjectURL(url);
    
    this.snackBar.open(`Downloaded as openapi.${this.format}`, 'Close', { duration: 2000 });
  }
  
  validateContract(): void {
    try {
      let parsed;
      if (this.format === 'yaml') {
        parsed = yaml.load(this.content);
      } else {
        parsed = JSON.parse(this.content);
      }
      
      // Basic OpenAPI validation
      if (!parsed.openapi || !parsed.info || !parsed.paths) {
        throw new Error('Invalid OpenAPI structure');
      }
      
      this.snackBar.open('Contract is valid', 'Close', { 
        duration: 2000,
        panelClass: ['success-snackbar']
      });
    } catch (error: any) {
      this.snackBar.open(`Validation error: ${error.message}`, 'Close', { 
        duration: 4000,
        panelClass: ['error-snackbar']
      });
    }
  }
  
  formatDocument(): void {
    try {
      let parsed;
      if (this.format === 'yaml') {
        parsed = yaml.load(this.content);
        this.content = yaml.dump(parsed, {
          indent: 2,
          lineWidth: -1,
          noRefs: true,
          sortKeys: false
        });
      } else {
        parsed = JSON.parse(this.content);
        this.content = JSON.stringify(parsed, null, 2);
      }
      this.updateLineCount();
      this.snackBar.open('Document formatted', 'Close', { duration: 2000 });
    } catch (error: any) {
      this.snackBar.open(`Format error: ${error.message}`, 'Close', { 
        duration: 4000,
        panelClass: ['error-snackbar']
      });
    }
  }
  
  findInDocument(): void {
    if (!this.searchTerm) return;
    
    // This would be implemented with Monaco's find functionality
    // For now, just show a message
    const occurrences = (this.content.match(new RegExp(this.searchTerm, 'gi')) || []).length;
    this.snackBar.open(`Found ${occurrences} occurrence(s) of "${this.searchTerm}"`, 'Close', { 
      duration: 2000 
    });
  }
  
  saveChanges(): void {
    if (!this.hasChanges || this.data.readOnly) return;
    
    try {
      let parsed;
      if (this.format === 'yaml') {
        parsed = yaml.load(this.content);
      } else {
        parsed = JSON.parse(this.content);
      }
      
      this.dialogRef.close({ 
        document: parsed, 
        format: this.format 
      });
    } catch (error: any) {
      this.snackBar.open(`Cannot save: ${error.message}`, 'Close', { 
        duration: 4000,
        panelClass: ['error-snackbar']
      });
    }
  }
  
  private updateLineCount(): void {
    this.lineCount = this.content.split('\n').length;
  }
  
  close(): void {
    if (this.hasChanges && !this.data.readOnly) {
      const confirmed = confirm('You have unsaved changes. Are you sure you want to close?');
      if (!confirmed) return;
    }
    this.dialogRef.close();
  }
}