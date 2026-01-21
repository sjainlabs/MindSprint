import { Component } from '@angular/core';

@Component({
  selector: 'app-avatar-selector',
  imports: [],
  templateUrl: './avatar-selector.html',
  styleUrl: './avatar-selector.css',
})
export class AvatarSelector {
  selectedAvatar: number = 1;
  
  avatars = [
    { id: 1, emoji: '🦊' },
    { id: 2, emoji: '🐼' },
    { id: 3, emoji: '🦁' },
    { id: 4, emoji: '🐨' },
    { id: 5, emoji: '🐸' },
    { id: 6, emoji: '🦄' },
    { id: 7, emoji: '🐻' },
    { id: 8, emoji: '🐯' },
  ];

  selectAvatar(id: number) {
    this.selectedAvatar = id;
  }
}
