import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { AccessCodePageComponent } from './access-code-page.component';

describe('AccessCodePageComponent', () => {
  let login: ReturnType<typeof vi.fn>;

  function setup() {
    login = vi.fn().mockResolvedValue({ id: 's1' });
    TestBed.configureTestingModule({
      imports: [AccessCodePageComponent],
      providers: [provideRouter([]), { provide: AuthService, useValue: { loginStudentWithCode: login } }],
    });
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(AccessCodePageComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const input = el.querySelector('input.code-input') as HTMLInputElement;
    const button = el.querySelector('button.submit-btn') as HTMLButtonElement;
    const type = (value: string) => {
      input.value = value;
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();
    };
    return { fixture, input, button, type };
  }

  it('accepts letters and numbers, in capitals', () => {
    const { input, button, type } = setup();
    type('k7p2qx');
    expect(input.value).toBe('K7P2QX');
    expect(button.disabled).toBe(false);
  });

  it('enables Continue as soon as the sixth character is typed', () => {
    const { button, type } = setup();
    type('K7P2Q');
    expect(button.disabled).toBe(true);
    type('K7P2QX');
    expect(button.disabled).toBe(false);
  });

  it('drops spaces, dashes and extra characters', () => {
    const { input, type } = setup();
    type('k7p-2qx9');
    expect(input.value).toBe('K7P2QX');
  });

  it('still accepts an all-digit code', () => {
    const { button, type } = setup();
    type('123456');
    expect(button.disabled).toBe(false);
  });

  it('logs in with the cleaned-up code', async () => {
    const { button, type, fixture } = setup();
    type('k7p2qx');
    button.click();
    await fixture.whenStable();
    expect(login).toHaveBeenCalledWith('K7P2QX');
  });
});
