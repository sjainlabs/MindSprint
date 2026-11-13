import { TestBed } from '@angular/core/testing';
import { AnalystCode, AnalystCodeService } from '../analyst/analyst-api.service';
import { AnalystCodeModalComponent } from './analyst-code-modal.component';

const CODE: AnalystCode = { code: 'ABCDEFGH', studentId: 's1', createdAt: '2026-11-12T00:00:00Z', expiresAt: '2026-12-12T00:00:00Z' };
const NEW_CODE: AnalystCode = { ...CODE, code: 'JKMNPQRS' };

describe('AnalystCodeModalComponent', () => {
  let api: { get: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn>; revoke: ReturnType<typeof vi.fn> };

  async function setup(existing: AnalystCode | null) {
    api = {
      get: vi.fn().mockResolvedValue(existing),
      create: vi.fn().mockResolvedValue(NEW_CODE),
      revoke: vi.fn().mockResolvedValue(undefined),
    };
    TestBed.configureTestingModule({
      imports: [AnalystCodeModalComponent],
      providers: [{ provide: AnalystCodeService, useValue: api }],
    });
    const fixture = TestBed.createComponent(AnalystCodeModalComponent);
    fixture.componentRef.setInput('studentId', 's1');
    fixture.componentRef.setInput('studentName', 'Maya');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  }

  const text = (el: HTMLElement) => el.textContent ?? '';
  const button = (el: HTMLElement, label: string) =>
    [...el.querySelectorAll('button')].find((b) => b.textContent?.trim() === label) as HTMLButtonElement;

  it('loads the code for the child', async () => {
    await setup(null);
    expect(api.get).toHaveBeenCalledWith('s1');
  });

  it('explains and creates a code when there is none', async () => {
    const fixture = await setup(null);
    const el = fixture.nativeElement as HTMLElement;
    expect(text(el)).toContain('Read-only');

    button(el, 'Create code').click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(api.create).toHaveBeenCalledWith('s1');
    expect(text(el)).toContain('JKMN-PQRS');
  });

  it('shows an existing code as XXXX-XXXX with its share link', async () => {
    const fixture = await setup(CODE);
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.code')?.textContent).toContain('ABCD-EFGH');
    expect((el.querySelector('#analyst-link') as HTMLInputElement).value).toMatch(/\/analyst\?code=ABCDEFGH$/);
    expect(text(el)).toContain('Expires');
  });

  it('regenerates only after confirming', async () => {
    const fixture = await setup(CODE);
    const el = fixture.nativeElement as HTMLElement;

    button(el, 'Make new code').click();
    fixture.detectChanges();
    expect(api.create).not.toHaveBeenCalled();
    expect(text(el)).toContain('old code will stop working');

    button(el, 'Yes, make a new code').click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(api.create).toHaveBeenCalledWith('s1');
    expect(el.querySelector('.code')?.textContent).toContain('JKMN-PQRS');
  });

  it('revokes only after confirming, then offers to create a code', async () => {
    const fixture = await setup(CODE);
    const el = fixture.nativeElement as HTMLElement;

    button(el, 'Revoke').click();
    fixture.detectChanges();
    expect(api.revoke).not.toHaveBeenCalled();

    button(el, 'Yes, revoke').click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(api.revoke).toHaveBeenCalledWith('s1');
    expect(button(el, 'Create code')).toBeTruthy();
  });

  it('cancel leaves the code alone', async () => {
    const fixture = await setup(CODE);
    const el = fixture.nativeElement as HTMLElement;

    button(el, 'Revoke').click();
    fixture.detectChanges();
    button(el, 'Cancel').click();
    fixture.detectChanges();

    expect(api.revoke).not.toHaveBeenCalled();
    expect(el.querySelector('.code')?.textContent).toContain('ABCD-EFGH');
  });

  it('shows an error when an action fails', async () => {
    const fixture = await setup(null);
    api.create.mockRejectedValue({ code: 'NETWORK', message: 'Could not reach the server.' });
    const el = fixture.nativeElement as HTMLElement;

    button(el, 'Create code').click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(text(el)).toContain('Could not reach the server.');
  });
});
