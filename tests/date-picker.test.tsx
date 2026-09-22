import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import DatePicker from '@/components/common/DatePicker';

describe('Common DatePicker Component', () => {
  it('renders correctly with label and placeholder in single mode', () => {
    render(<DatePicker label="วันที่ตรวจ" placeholder="กรุณาเลือกวัน" />);
    expect(screen.getByText('วันที่ตรวจ')).toBeInTheDocument();
    expect(screen.getByText('กรุณาเลือกวัน')).toBeInTheDocument();
  });

  it('selects a single date and calls onChange', () => {
    const handleChange = vi.fn();
    render(<DatePicker label="วันที่ตรวจ" value="2026-09-15" onChange={handleChange} />);

    // Click trigger to open popover
    const trigger = screen.getByRole('button', { name: /15 ก\.ย\. 2569/ });
    fireEvent.click(trigger);

    expect(screen.getByRole('dialog', { name: 'วันที่ตรวจ' })).toBeInTheDocument();

    // Find and click day 20
    const day20 = screen.getByLabelText('วันที่ 20 กันยายน 2569');
    fireEvent.click(day20);

    expect(handleChange).toHaveBeenCalledWith('2026-09-20');
    // Dialog should close after single date selection
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('disables dates earlier than minDate', () => {
    render(<DatePicker label="วันที่ตรวจ" value="2026-09-15" minDate="2026-09-10" />);

    const trigger = screen.getByRole('button', { name: /15 ก\.ย\. 2569/ });
    fireEvent.click(trigger);

    // Day 5 should be disabled
    const day5 = screen.getByLabelText('วันที่ 5 กันยายน 2569');
    expect(day5).toBeDisabled();

    // Day 12 should be enabled
    const day12 = screen.getByLabelText('วันที่ 12 กันยายน 2569');
    expect(day12).not.toBeDisabled();
  });

  it('handles date range selection in range mode', () => {
    const handleRangeChange = vi.fn();
    render(
      <DatePicker
        mode="range"
        label="ช่วงวันลา"
        startDate="2026-09-10"
        endDate="2026-09-15"
        onRangeChange={handleRangeChange}
      />
    );

    // Check displayed range text on button
    expect(screen.getByText(/10 ก\.ย\. 2569 – 15 ก\.ย\. 2569/)).toBeInTheDocument();

    const trigger = screen.getByRole('button', { name: /10 ก\.ย\. 2569 – 15 ก\.ย\. 2569/ });
    fireEvent.click(trigger);

    // Click day 12 as new start
    const day12 = screen.getByLabelText('วันที่ 12 กันยายน 2569');
    fireEvent.click(day12);

    // Should indicate selecting end date
    expect(screen.getByText('เลือกวันสิ้นสุด')).toBeInTheDocument();

    // Click day 18 as end
    const day18 = screen.getByLabelText('วันที่ 18 กันยายน 2569');
    fireEvent.click(day18);

    expect(handleRangeChange).toHaveBeenCalledWith('2026-09-12', '2026-09-18');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('navigates months using chevron buttons', () => {
    render(<DatePicker label="วันที่ตรวจ" value="2026-09-15" />);

    const trigger = screen.getByRole('button', { name: /15 ก\.ย\. 2569/ });
    fireEvent.click(trigger);

    expect(screen.getByText('กันยายน 2569')).toBeInTheDocument();

    // Click next month
    const nextBtn = screen.getByLabelText('เดือนถัดไป');
    fireEvent.click(nextBtn);

    expect(screen.getByText('ตุลาคม 2569')).toBeInTheDocument();

    // Click prev month twice
    const prevBtn = screen.getByLabelText('เดือนก่อนหน้า');
    fireEvent.click(prevBtn);
    fireEvent.click(prevBtn);

    expect(screen.getByText('สิงหาคม 2569')).toBeInTheDocument();
  });

  it('closes when pressing Escape key', () => {
    render(<DatePicker label="วันที่ตรวจ" value="2026-09-15" />);

    const trigger = screen.getByRole('button', { name: /15 ก\.ย\. 2569/ });
    fireEvent.click(trigger);
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('clears date when clicking clear button', () => {
    const handleChange = vi.fn();
    render(<DatePicker label="วันที่ตรวจ" value="2026-09-15" onChange={handleChange} />);

    const trigger = screen.getByRole('button', { name: /15 ก\.ย\. 2569/ });
    fireEvent.click(trigger);

    const clearBtn = screen.getByText('ล้างค่า');
    fireEvent.click(clearBtn);

    expect(handleChange).toHaveBeenCalledWith('');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

