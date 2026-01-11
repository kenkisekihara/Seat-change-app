
import React, { useState, useEffect, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { 
  Shuffle, 
  ArrowLeftRight, 
  FileSpreadsheet, 
  Upload, 
  RefreshCcw,
  Info,
  FileDown,
  Lock,
  Ban,
  ShieldCheck,
  CheckCircle2,
  ServerOff,
  Layout
} from 'lucide-react';
import { Student, Seat, Gender } from './types';
import { ROWS, COLS, DEFAULT_STUDENTS } from './constants';
import SeatCard from './components/SeatCard';

const App: React.FC = () => {
  const [students, setStudents] = useState<Student[]>(DEFAULT_STUDENTS);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [selectedSeatIndex, setSelectedSeatIndex] = useState<number | null>(null);
  const [swapIds, setSwapIds] = useState({ id1: '', id2: '' });
  const [isProcessing, setIsProcessing] = useState(false);

  /**
   * 座席の初期化
   * 空席を教室後方（画面上部）に配置するロジック
   */
  const initializeSeats = useCallback((studentList: Student[]) => {
    const totalSeatsCount = ROWS * COLS;
    const newSeats: Seat[] = [];

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        newSeats.push({
          row: r,
          col: c,
          student: null,
          isLocked: false,
          isUnusable: false
        });
      }
    }

    const reversedIndices = Array.from({ length: totalSeatsCount }, (_, i) => i).reverse();
    
    studentList.forEach((student, i) => {
      if (i < totalSeatsCount) {
        newSeats[reversedIndices[i]].student = student;
      }
    });

    setSeats(newSeats);
  }, []);

  useEffect(() => {
    initializeSeats(students);
  }, [initializeSeats]);

  const handleShuffle = () => {
    if (students.length === 0) {
      alert("名簿をインポートしてから実行してください。");
      return;
    }

    setIsProcessing(true);

    setTimeout(() => {
      const targetIndices = seats.reduce((acc, seat, idx) => {
        if (!seat.isLocked && !seat.isUnusable) acc.push(idx);
        return acc;
      }, [] as number[]);

      const studentsInPlay = seats
        .filter((_, idx) => targetIndices.includes(idx))
        .map(s => s.student)
        .filter((s): s is Student => s !== null);

      if (targetIndices.length < studentsInPlay.length) {
        alert("有効な座席数が不足しています。座席設定を見直してください。");
        setIsProcessing(false);
        return;
      }

      const shuffledStudents = [...studentsInPlay].sort(() => Math.random() - 0.5);
      const newSeats = [...seats];
      
      targetIndices.forEach(idx => {
        newSeats[idx].student = null;
      });

      const fillIndices = [...targetIndices].sort((a, b) => b - a);
      
      shuffledStudents.forEach((student, i) => {
        const seatIdx = fillIndices[i];
        newSeats[seatIdx].student = student;
      });

      setSeats(newSeats);
      setSelectedSeatIndex(null);
      setIsProcessing(false);
    }, 500); 
  };

  const handleToggleLock = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (seats[index].isUnusable) return;
    const newSeats = [...seats];
    newSeats[index].isLocked = !newSeats[index].isLocked;
    setSeats(newSeats);
    if (selectedSeatIndex === index) setSelectedSeatIndex(null);
  };

  const handleToggleUnusable = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSeats = [...seats];
    const targetSeat = newSeats[index];
    if (!targetSeat.isUnusable) {
      targetSeat.isLocked = false;
      targetSeat.student = null;
    }
    targetSeat.isUnusable = !targetSeat.isUnusable;
    setSeats(newSeats);
    if (selectedSeatIndex === index) setSelectedSeatIndex(null);
  };

  const handleSeatClick = (index: number) => {
    if (seats[index].isLocked || seats[index].isUnusable) return;
    if (selectedSeatIndex === null) {
      if (seats[index].student) setSelectedSeatIndex(index);
    } else {
      const newSeats = [...seats];
      const temp = newSeats[selectedSeatIndex].student;
      newSeats[selectedSeatIndex].student = newSeats[index].student;
      newSeats[index].student = temp;
      setSeats(newSeats);
      setSelectedSeatIndex(null);
    }
  };

  const handleManualSwap = () => {
    const { id1, id2 } = swapIds;
    if (!id1 || !id2) return;
    const idx1 = seats.findIndex(s => s.student?.id === id1);
    const idx2 = seats.findIndex(s => s.student?.id === id2);
    if (idx1 === -1 || idx2 === -1) {
      alert("該当する生徒が見つかりません。");
      return;
    }
    const newSeats = [...seats];
    const temp = newSeats[idx1].student;
    newSeats[idx1].student = newSeats[idx2].student;
    newSeats[idx2].student = temp;
    setSeats(newSeats);
    setSwapIds({ id1: '', id2: '' });
  };

  const downloadTemplate = () => {
    const data = [
      { "学籍番号": "1001", "名前": "佐藤 健一", "選択科目": "物理", "性別": "男" },
      { "学籍番号": "1002", "名前": "田中 美咲", "選択科目": "生物", "性別": "女" }
    ];
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "名簿テンプレート.xlsx");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessing(true);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = evt.target?.result;
      const workbook = XLSX.read(data, { type: 'binary' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(sheet) as any[];
      const imported = json.map((row: any) => ({
        id: String(row['学籍番号'] || row['id'] || ''),
        name: String(row['名前'] || row['name'] || '不明'),
        subject: String(row['選択科目'] || row['subject'] || ''),
        gender: ((row['性別'] === '女' || row['gender'] === 'female') ? '女' : '男') as Gender
      })).filter(s => s.id);
      setStudents(imported);
      initializeSeats(imported);
      setIsProcessing(false);
    };
    reader.readAsBinaryString(file);
  };

  const exportExcel = () => {
    const tableData = [];
    const header = [];
    for (let c = 0; c < COLS; c++) header.push(`${c + 1}列目`);
    tableData.push(header);

    for (let r = 0; r < ROWS; r++) {
      const rowArr = [];
      for (let c = 0; c < COLS; c++) {
        const seat = seats.find(s => s.row === r && s.col === c);
        if (seat?.isUnusable) {
          rowArr.push("使用不可");
        } else if (seat?.student) {
          rowArr.push(`${seat.student.name} (${seat.student.id})`);
        } else {
          rowArr.push("(空席)");
        }
      }
      tableData.push(rowArr);
    }

    const ws = XLSX.utils.aoa_to_sheet(tableData);
    ws['!cols'] = Array(COLS).fill({ wch: 25 });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "座席表");
    XLSX.writeFile(wb, "座席表_出力.xlsx");
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Privacy Top Banner */}
      <div className="bg-emerald-900 text-emerald-100 py-2.5 px-4 text-center text-[11px] font-bold tracking-widest uppercase flex items-center justify-center gap-2.5 shadow-sm">
        <ShieldCheck size={16} className="text-emerald-400" />
        <span>セキュア・プライバシーモード: データはサーバーへ送信されません</span>
      </div>

      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-[1800px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-xl sm:p-2.5 sm:rounded-2xl text-white shadow-xl shadow-indigo-100">
              <ShieldCheck size={20} className="sm:w-[24px] sm:h-[24px]" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-black text-slate-800 tracking-tighter">
                席替えツール
              </h1>
            </div>
          </div>
          
          <button 
            onClick={handleShuffle}
            disabled={isProcessing || students.length === 0}
            className={`flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 sm:px-14 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-black transition-all shadow-xl shadow-indigo-100 active:scale-95 disabled:opacity-50 disabled:shadow-none`}
          >
            {isProcessing ? <RefreshCcw size={16} className="animate-spin sm:w-[18px] sm:h-[18px]" /> : <Shuffle size={16} className="sm:w-[18px] sm:h-[18px]" />}
            席替え実行
          </button>
        </div>
      </header>

      <main className="max-w-[1800px] mx-auto px-4 sm:px-6 pt-6 sm:pt-8 grid grid-cols-1 xl:grid-cols-5 gap-8">
        {/* Sidebar */}
        <aside className="xl:col-span-1 flex flex-col gap-6">
          
          {/* Privacy Awareness Card */}
          <section className="bg-white p-6 rounded-[2rem] sm:rounded-[2.5rem] border border-slate-200 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-[0.05]">
              <Lock size={64} className="text-emerald-600" />
            </div>
            <h2 className="text-xs font-black text-emerald-600 uppercase tracking-widest mb-4 flex items-center gap-2">
              <ShieldCheck size={16} /> プライバシー保護
            </h2>
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="mt-1"><ServerOff size={16} className="text-slate-400" /></div>
                <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
                  本アプリはクライアントサイド・レンダリングを採用しています。データはサーバーに保存されず、ブラウザを閉じると完全に消去されます。
                </p>
              </div>
              <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-100">
                <div className="flex items-center gap-2 text-[10px] font-black text-emerald-700 uppercase mb-1">
                  <CheckCircle2 size={12} /> 安全ステータス
                </div>
                <div className="text-[10px] text-emerald-600/80 font-bold">
                  ローカル処理のみ (安全)
                </div>
              </div>
            </div>
          </section>

          <section className="bg-white p-6 rounded-[2rem] sm:rounded-[2.5rem] border border-slate-200 shadow-sm relative overflow-hidden">
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Upload size={16} className="text-indigo-500" /> 名簿読み込み
            </h2>
            <button 
              onClick={downloadTemplate}
              className="w-full flex items-center justify-center gap-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 py-3 rounded-2xl text-xs font-bold transition-colors mb-4 border border-indigo-100"
            >
              <FileDown size={14} /> テンプレートDL
            </button>
            <label className="flex flex-col items-center justify-center w-full h-32 sm:h-40 border-2 border-dashed border-slate-200 rounded-[1.5rem] sm:rounded-[2rem] cursor-pointer hover:bg-slate-50 transition-all hover:border-indigo-400 group">
              <FileSpreadsheet className="text-slate-300 group-hover:text-indigo-400 mb-2 transition-colors" size={32} />
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider text-center px-4">Excel / CSV をアップロード</p>
              <input type="file" className="hidden" accept=".xlsx, .csv" onChange={handleFileUpload} />
            </label>
          </section>

          <section className="bg-white p-6 rounded-[2rem] sm:rounded-[2.5rem] border border-slate-200 shadow-sm">
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <ArrowLeftRight size={16} className="text-indigo-500" /> 手動入れ替え
            </h2>
            <div className="space-y-3">
              <input 
                type="text" placeholder="学籍番号 1" value={swapIds.id1}
                onChange={(e) => setSwapIds({...swapIds, id1: e.target.value})}
                className="w-full px-5 py-3.5 text-xs border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium"
              />
              <input 
                type="text" placeholder="学籍番号 2" value={swapIds.id2}
                onChange={(e) => setSwapIds({...swapIds, id2: e.target.value})}
                className="w-full px-5 py-3.5 text-xs border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium"
              />
              <button 
                onClick={handleManualSwap}
                disabled={students.length === 0}
                className="w-full bg-slate-900 hover:bg-black text-white py-4 rounded-2xl text-xs font-bold transition-all disabled:opacity-30 shadow-lg"
              >
                入れ替え実行
              </button>
            </div>
          </section>
        </aside>

        {/* Main Seat Area */}
        <section className="xl:col-span-4">
          <div className="bg-white p-6 sm:p-14 rounded-[2.5rem] sm:rounded-[4rem] border border-slate-200 shadow-xl relative min-h-[500px] sm:min-h-[700px] flex flex-col overflow-x-auto">
            
            {/* Classroom Layout Guide */}
            <div className="flex items-center justify-between mb-8 sm:mb-10 px-2 sm:px-6 text-[8px] sm:text-[10px] font-black text-slate-300 uppercase tracking-[0.4em] sm:tracking-[0.6em] min-w-[500px] sm:min-w-0">
              <div className="flex items-center gap-2">
                <Layout size={14} className="rotate-180" /> 廊下側
              </div>
              <div className="flex items-center gap-4 sm:gap-6 flex-1 px-4 sm:px-10">
                <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-slate-100"></div>
                <span className="whitespace-nowrap">教 室 後 方</span>
                <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-slate-100"></div>
              </div>
              <div className="flex items-center gap-2">
                窓側 <Layout size={14} />
              </div>
            </div>

            {/* Seating Grid */}
            <div className="flex-1 overflow-x-auto sm:overflow-visible">
              <div className="grid grid-cols-6 gap-2 sm:gap-6 xl:gap-8 min-w-[450px] sm:min-w-0">
                {seats.map((seat, index) => (
                  <SeatCard
                    key={index}
                    student={seat.student}
                    row={seat.row}
                    col={seat.col}
                    isSelected={selectedSeatIndex === index}
                    isLocked={seat.isLocked}
                    isUnusable={seat.isUnusable}
                    onClick={() => handleSeatClick(index)}
                    onToggleLock={(e) => handleToggleLock(index, e)}
                    onToggleUnusable={(e) => handleToggleUnusable(index, e)}
                  />
                ))}
              </div>
            </div>

            {/* Front Area (Teacher's Desk) */}
            <div className="mt-12 sm:mt-20 mb-4 text-center min-w-[450px] sm:min-w-0">
              <div className="relative inline-block px-12 sm:px-36 py-4 sm:py-8 bg-slate-900 rounded-2xl sm:rounded-[3rem] text-white font-black uppercase tracking-[0.3em] sm:tracking-[0.5em] text-xs sm:text-sm shadow-2xl border-[4px] sm:border-[8px] border-slate-800 transition-transform hover:scale-105">
                <div className="absolute -top-3 sm:-top-4 left-1/2 -translate-x-1/2 bg-indigo-500 text-[8px] sm:text-[9px] px-3 sm:px-4 py-0.5 sm:py-1 rounded-full text-white font-black shadow-lg">FRONT AREA</div>
                教 卓 (前 方)
              </div>
            </div>

            {/* Indicators & Stats */}
            <div className="mt-10 sm:mt-16 pt-8 sm:pt-10 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6 sm:gap-10 min-w-[450px] sm:min-w-0">
              <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8">
                <div className="flex items-center gap-2 sm:gap-3 text-[8px] sm:text-[10px] font-black text-indigo-600 bg-indigo-50/50 px-4 sm:px-6 py-2 sm:py-3 rounded-xl sm:rounded-2xl border border-indigo-100/50 shadow-sm">
                  <Lock size={12} className="sm:w-[14px] sm:h-[14px]" /> 固定
                </div>
                <div className="flex items-center gap-2 sm:gap-3 text-[8px] sm:text-[10px] font-black text-rose-600 bg-rose-50/50 px-4 sm:px-6 py-2 sm:py-3 rounded-xl sm:rounded-2xl border border-rose-100/50 shadow-sm">
                  <Ban size={12} className="sm:w-[14px] sm:h-[14px]" /> 不可
                </div>
                <div className="flex items-center gap-2 sm:gap-3 text-[8px] sm:text-[10px] font-black text-slate-400 bg-slate-50 px-4 sm:px-6 py-2 sm:py-3 rounded-xl sm:rounded-2xl border border-slate-200/50 shadow-sm text-center">
                  <Info size={12} className="sm:w-[14px] sm:h-[14px]" /> 空席は後方へ
                </div>
              </div>
              
              <div className="flex items-center gap-6">
                <div className="text-[10px] sm:text-[11px] font-black text-slate-500 bg-slate-100 px-6 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-[1.5rem] border border-slate-200 flex items-center gap-2 sm:gap-3 shadow-inner">
                  <CheckCircle2 size={14} className="text-emerald-500 sm:w-[16px] sm:h-[16px]" />
                  登録: <span className="text-indigo-600 text-sm sm:text-base">{students.length} 名</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 sm:mt-10">
            <button 
              onClick={exportExcel}
              disabled={students.length === 0}
              className="w-full flex items-center justify-center gap-3 sm:gap-4 bg-emerald-600 hover:bg-emerald-700 text-white py-5 sm:py-7 rounded-[2rem] sm:rounded-[3rem] font-black transition-all shadow-2xl shadow-emerald-100 active:scale-[0.99] disabled:opacity-50 disabled:shadow-none text-sm sm:text-lg"
            >
              <FileSpreadsheet size={22} className="sm:w-[28px] sm:h-[28px]" /> 
              <span>座席表をExcel出力 (.xlsx)</span>
            </button>
            <div className="mt-6 flex flex-col items-center gap-2">
              <p className="text-center text-[8px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] leading-relaxed px-4">
                ※ セキュリティ保護のため、ブラウザのリロードで全データが完全に消去されます。
              </p>
              <div className="flex items-center gap-2 text-[8px] sm:text-[9px] text-emerald-500 font-bold uppercase bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                <ShieldCheck size={10} className="sm:w-[12px] sm:h-[12px]" /> Privacy Verified: Local Execution
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default App;
