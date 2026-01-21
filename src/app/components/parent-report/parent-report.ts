import { Component } from '@angular/core';

@Component({
  selector: 'app-parent-report',
  imports: [],
  templateUrl: './parent-report.html',
  styleUrl: './parent-report.css',
})
export class ParentReport {
  showReport: boolean = false;

  toggleReport() {
    this.showReport = !this.showReport;
  }
}
