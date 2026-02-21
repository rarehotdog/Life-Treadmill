import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from './utils';
import { buttonVariants } from './_shared/button';

type CalendarProps = React.ComponentProps<'div'> & {
  month?: Date;
  onMonthChange?: (month: Date) => void;
  selected?: Date;
  onSelect?: (date: Date) => void;
  showOutsideDays?: boolean;
  classNames?: Record<string, string>;
};

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  month,
  onMonthChange,
  selected,
  onSelect,
  ...props
}: CalendarProps) {
  const [internalMonth, setInternalMonth] = React.useState(() => startOfMonth(month ?? new Date()));
  const visibleMonth = month ? startOfMonth(month) : internalMonth;

  const monthStart = startOfMonth(visibleMonth);
  const monthEnd = endOfMonth(visibleMonth);

  const startWeekday = monthStart.getDay();
  const daysInMonth = monthEnd.getDate();

  const rows: Array<Array<Date | null>> = [];
  let currentDay = 1 - startWeekday;

  for (let week = 0; week < 6; week += 1) {
    const row: Array<Date | null> = [];
    for (let day = 0; day < 7; day += 1) {
      const cellDate = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), currentDay);
      const outside = cellDate.getMonth() !== visibleMonth.getMonth();

      if (!showOutsideDays && outside) {
        row.push(null);
      } else {
        row.push(cellDate);
      }

      currentDay += 1;
    }
    rows.push(row);

    const ended = currentDay > daysInMonth && week > 3;
    if (ended) break;
  }

  const changeMonth = (offset: number) => {
    const next = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + offset, 1);
    if (!month) setInternalMonth(next);
    onMonthChange?.(next);
  };

  const weekday = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  return (
    <div className={cn('p-3', className)} {...props}>
      <div className={cn('mb-2 flex items-center justify-between', classNames?.caption)}>
        <button
          type="button"
          className={cn(buttonVariants({ variant: 'outline', size: 'icon' }), 'h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100', classNames?.nav_button, classNames?.nav_button_previous)}
          onClick={() => changeMonth(-1)}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className={cn('text-sm font-medium', classNames?.caption_label)}>
          {visibleMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </div>
        <button
          type="button"
          className={cn(buttonVariants({ variant: 'outline', size: 'icon' }), 'h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100', classNames?.nav_button, classNames?.nav_button_next)}
          onClick={() => changeMonth(1)}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className={cn('w-full', classNames?.table)}>
        <div className={cn('mb-2 grid grid-cols-7 gap-1', classNames?.head_row)}>
          {weekday.map((day) => (
            <div key={day} className={cn('text-center text-xs text-gray-500', classNames?.head_cell)}>
              {day}
            </div>
          ))}
        </div>

        <div className="space-y-1">
          {rows.map((row, rowIndex) => (
            <div key={`row-${rowIndex}`} className={cn('grid grid-cols-7 gap-1', classNames?.row)}>
              {row.map((cellDate, cellIndex) => {
                if (!cellDate) {
                  return <div key={`cell-${rowIndex}-${cellIndex}`} className={cn('h-8 w-8', classNames?.day_hidden)} />;
                }

                const isOutside = cellDate.getMonth() !== visibleMonth.getMonth();
                const isToday = isSameDay(cellDate, new Date());
                const isSelected = selected ? isSameDay(cellDate, selected) : false;

                return (
                  <button
                    key={`cell-${rowIndex}-${cellIndex}`}
                    type="button"
                    onClick={() => onSelect?.(cellDate)}
                    className={cn(
                      buttonVariants({ variant: 'ghost', size: 'icon' }),
                      'h-8 w-8 p-0 text-sm font-normal',
                      isOutside && 'text-gray-400',
                      isToday && 'bg-gray-100 text-gray-900',
                      isSelected && 'bg-blue-600 text-white hover:bg-blue-600 hover:text-white',
                      classNames?.day,
                    )}
                  >
                    {cellDate.getDate()}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
