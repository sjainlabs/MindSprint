import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-avatar-selector',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './avatar-selector.component.html',
  styleUrls: ['./avatar-selector.component.css']
})
export class AvatarSelectorComponent {
  @Input() selectedAvatar: string = '👦';
  
  avatars = ['👦', '👧', '🐱', '🐶', '🦊', '🐻', '🦁', '🐼'];
  
  selectAvatar(avatar: string) {
    this.selectedAvatar = avatar;
  }
}
