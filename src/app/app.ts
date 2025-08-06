import { Component, signal } from '@angular/core';
import { Three } from './three/three';
// import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [Three,],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('Xeotik_Test');
}
