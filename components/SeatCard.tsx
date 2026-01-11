
import React from 'react';
import { Student } from '../types';
import { User, UserCheck, Trash2 } from 'lucide-react';

interface SeatCardProps {
  student: Student | null;
  isSelected: boolean;
  onClick: () => void;
  row: number;
  col: number;
}

const SeatCard: React.FC<SeatCardProps> = ({ student, isSelected, onClick, row, col }) => {
  return (
    <div
      onClick={onClick}
      className={`
        relative flex flex-col items-center justify-center p-2 rounded-lg border-2 transition-all cursor-pointer h-24 w-full
        ${student 
          ? (isSelected ? 'border-blue-500 bg-blue-50 shadow-md scale-105' : 'border-slate-200 bg-white hover:border-blue-300 hover:shadow-sm') 
          : 'border-dashed border-slate-300 bg-slate-50 opacity-60 hover:opacity-100'}
      `}
    >
      <div className="absolute top-1 left-1 text-[10px] text-slate-400 font-mono">
        R{row+1}C{col+1}
      </div>
      
      {student ? (
        <>
          <div className={`p-1 rounded-full mb-1 ${student.gender === '男' ? 'bg-blue-100 text-blue-600' : 'bg-rose-100 text-rose-600'}`}>
            <User size={16} />
          </div>
          <div className="text-xs font-bold truncate max-w-full">{student.name}</div>
          <div className="text-[10px] text-slate-500">{student.id}</div>
          <div className="text-[10px] px-1 bg-slate-100 rounded mt-1 truncate max-w-full">{student.subject}</div>
        </>
      ) : (
        <div className="text-xs text-slate-400 font-medium italic">空席</div>
      )}

      {isSelected && (
        <div className="absolute top-0 right-0 -mt-1 -mr-1">
          <div className="bg-blue-500 text-white rounded-full p-0.5">
            <UserCheck size={12} />
          </div>
        </div>
      )}
    </div>
  );
};

export default SeatCard;
