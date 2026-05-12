import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LanguageToggleComponent } from '../../components/language-toggle/language-toggle';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'app-welcome',
  imports: [RouterLink, LanguageToggleComponent, TranslatePipe],
  templateUrl: './welcome.html',
  styleUrl: './welcome.css',
})
export class Welcome {}
