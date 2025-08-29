import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface ConfirmDialogData {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
  details?: string[];
}

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule
  ],
  template: `
    <h2 mat-dialog-title>
      <mat-icon [class]="'dialog-icon ' + data.type">
        {{ getIcon() }}
      </mat-icon>
      {{ data.title }}
    </h2>
    <mat-dialog-content>
      <p class="message">{{ data.message }}</p>
      <ul *ngIf="data.details && data.details.length > 0" class="details-list">
        <li *ngFor="let detail of data.details">{{ detail }}</li>
      </ul>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">
        {{ data.cancelText || 'Cancel' }}
      </button>
      <button mat-raised-button 
              [color]="data.type === 'danger' ? 'warn' : 'primary'"
              (click)="onConfirm()">
        {{ data.confirmText || 'Confirm' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    h2 {
      display: flex;
      align-items: center;
      gap: 12px;
      margin: 0;
      padding: 20px 24px;
      border-bottom: 1px solid #e0e0e0;
    }
    
    .dialog-icon {
      font-size: 28px;
      width: 28px;
      height: 28px;
      
      &.danger {
        color: #f44336;
      }
      
      &.warning {
        color: #ff9800;
      }
      
      &.info {
        color: #2196f3;
      }
    }
    
    mat-dialog-content {
      padding: 24px;
      min-width: 400px;
      max-width: 500px;
    }
    
    .message {
      margin: 0 0 16px 0;
      font-size: 14px;
      line-height: 1.5;
      color: #333;
    }
    
    .details-list {
      margin: 16px 0 0 0;
      padding: 12px;
      background: #f5f5f5;
      border-radius: 4px;
      list-style: none;
      
      li {
        padding: 4px 0;
        font-size: 13px;
        color: #666;
        
        &:before {
          content: '• ';
          color: #999;
          margin-right: 8px;
        }
      }
    }
    
    mat-dialog-actions {
      padding: 16px 24px;
      border-top: 1px solid #e0e0e0;
      gap: 8px;
    }
  `]
})
export class ConfirmDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<ConfirmDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmDialogData
  ) {
    if (!data.type) {
      data.type = 'info';
    }
  }

  getIcon(): string {
    switch (this.data.type) {
      case 'danger':
        return 'delete_forever';
      case 'warning':
        return 'warning';
      default:
        return 'info';
    }
  }

  onConfirm(): void {
    this.dialogRef.close(true);
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}