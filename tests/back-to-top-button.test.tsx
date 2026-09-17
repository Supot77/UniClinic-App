import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import BackToTopButton from '@/components/common/BackToTopButton';

describe('BackToTopButton', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 0 });
    window.scrollTo = vi.fn();
  });

  it('appears after scrolling down and returns to the top with smooth scrolling', () => {
    render(<BackToTopButton />);

    expect(screen.queryByRole('button', { name: 'กลับขึ้นด้านบน' })).not.toBeInTheDocument();

    Object.defineProperty(window, 'scrollY', { configurable: true, value: 640 });
    fireEvent.scroll(window);

    const button = screen.getByRole('button', { name: 'กลับขึ้นด้านบน' });
    expect(button).toBeInTheDocument();
    fireEvent.click(button);

    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
  });

  it('hides again when the page returns near the top', () => {
    render(<BackToTopButton />);

    Object.defineProperty(window, 'scrollY', { configurable: true, value: 640 });
    fireEvent.scroll(window);
    expect(screen.getByRole('button', { name: 'กลับขึ้นด้านบน' })).toBeInTheDocument();

    Object.defineProperty(window, 'scrollY', { configurable: true, value: 120 });
    fireEvent.scroll(window);
    expect(screen.queryByRole('button', { name: 'กลับขึ้นด้านบน' })).not.toBeInTheDocument();
  });
});
