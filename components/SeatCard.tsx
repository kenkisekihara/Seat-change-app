
import React from 'react';
import { Student } from '../types';
import { User, UserCheck, Lock, Unlock, Ban } from 'lucide-react';

interface SeatCardProps {
  student: Student | null;
  isSelected: boolean;
  isLocked: boolean;
  isUnusable: boolean;
  onClick: () => void;
  onToggleLock: (e: React.MouseEvent) => void;
  onToggleUnusable: (e: React.MouseEvent) => void;
  row: number;
  col: number;
}

const SeatCard: React.FC<SeatCardProps> = ({ 
  student, 
  isSelected, 
  isLocked, 
  isUnusable,
  onClick, 
  onToggleLock, 
  onToggleUnusable,
  row, 
  col 
}) => {
  return (
    <div
      onClick={isUnusable ? undefined : onClick}
      className={`
        relative flex flex-col items-center justify-center p-1 sm:p-2 rounded-lg border-2 transition-all h-20 sm:h-24 w-full
        ${isUnusable 
          ? 'bg-slate-200 border-slate-300 opacity-80 cursor-default' 
          : isLocked 
            ? 'bg-indigo-50/50 border-indigo-300 cursor-pointer' 
            : 'bg-white border-slate-200 cursor-pointer'}
        ${!isUnusable && student 
          ? (isSelected ? 'border-blue-500 bg-blue-50 shadow-md scale-105 z-10' : 'hover:border-blue-300 hover:shadow-sm') 
          : (!isUnusable ? 'border-dashed border-slate-300 bg-slate-50 opacity-60 hover:opacity-100' : '')}
      `}
    >
      <div className="absolute top-0.5 left-1 text-[8px] sm:text-[10px] text-slate-400 font-mono">
        R{row+1}C{col+1}
      </div>

      <div className="absolute top-0.5 right-0.5 flex gap-0.5">
        <button
          onClick={onToggleUnusable}
          className={`
            p-0.5 sm:p-1 rounded-md transition-colors
            ${isUnusable ? 'text-red-600 bg-red-100' : 'text-slate-300 hover:text-red-400 hover:bg-red-50'}
          `}
        >
          <Ban size={10} className="sm:w-[12px] sm:h-[12px]" />
        </button>

        {!isUnusable && (
          <button
            onClick={onToggleLock}
            className={`
              p-0.5 sm:p-1 rounded-md transition-colors
              ${isLocked ? 'text-indigo-600 bg-indigo-100' : 'text-slate-300 hover:text-indigo-400 hover:bg-indigo-50'}
            `}
          >
            {isLocked ? <Lock size={10} className="sm:w-[12px] sm:h-[12px]" /> : <Unlock size={10} className="sm:w-[12px] sm:h-[12px]" />}
          </button>
        )}
      </div>
      
      {isUnusable ? (
        <div className="flex flex-col items-center justify-center opacity-40">
          <Ban size={16} className="text-slate-500 mb-0.5 sm:mb-1 sm:w-[20px] sm:h-[20px]" />
          <div className="text-[8px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-tighter">不可</div>
        </div>
      ) : student ? (
        <>
          <div className={`p-0.5 sm:p-1 rounded-full mb-0.5 sm:mb-1 ${student.gender === '男' ? 'bg-blue-100 text-blue-600' : 'bg-rose-100 text-rose-600'}`}>
            <User size={12} className="sm:w-[16px] sm:h-[16px]" />
          </div>
          <div className="text-[10px] sm:text-xs font-bold truncate max-w-full leading-tight">{student.name}</div>
          <div className="text-[8px] sm:text-[10px] text-slate-500">{student.id}</div>
          <div className="hidden sm:block text-[9px] px-1 bg-slate-100 rounded mt-0.5 truncate max-w-full">{student.subject}</div>
        </>
      ) : (
        <div className="text-[10px] sm:text-xs text-slate-400 font-medium italic">空席</div>
      )}

      {isSelected && !isLocked && !isUnusable && (
        <div className="absolute bottom-0.5 right-0.5">
          <div className="bg-blue-500 text-white rounded-full p-0.5">
            <UserCheck size={8} className="sm:w-[12px] sm:h-[12px]" />
          </div>
        </div>
      )}
    </div>
  );
};

export default SeatCard;
