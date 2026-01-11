
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
  Zap,
  EyeOff
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

  // 初期配置
  const initializeSeats = useCallback((studentList: Student[]) => {
    const newSeats: Seat[] = [];
    let studentIndex = 0;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        newSeats.push({
          row: r,
          col: c,
          student: studentList[studentIndex] || null,
          isLocked: false,
          isUnusable: false
        });
        studentIndex++;
      }
    }
    setSeats(newSeats);
  }, []);

  useEffect(() => {
    initializeSeats(students);
  }, [initializeSeats]);

  const handleShuffle = () => {
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
        alert("座席数が不足しています。");
        setIsProcessing(false);
        return;
      }

      const shuffledStudents = [...studentsInPlay].sort(() => Math.random() - 0.5);
      const newSeats = [...seats];
      
      targetIndices.forEach(idx => {
        newSeats[idx].student = null;
      });

      shuffledStudents.forEach((student, i) => {
        const seatIdx = targetIndices[i];
        newSeats[seatIdx].student = student;
      });

      setSeats(newSeats);
      setSelectedSeatIndex(null);
      setIsProcessing(false);
    }, 400); // セキュアな処理感を出すための僅かな遅延
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
      setSelectedSeatIndex(index);
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
      alert("学籍番号が見つかりません。");
      return;
    }
    if (seats[idx1].isLocked || seats[idx2].isLocked || seats[idx1].isUnusable || seats[idx2].isUnusable) {
      alert("固定/不可の座席は入れ替えられません。");
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
    XLSX.writeFile(wb, "席替えテンプレート.xlsx");
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
      {/* セキュリティバナー */}
      <div className="bg-indigo-900 text-indigo-100 py-1.5 px-4 text-center text-[10px] font-bold tracking-widest uppercase flex items-center justify-center gap-2">
        <ShieldCheck size={12} />
        完全ローカル実行モード: アップロードされたファイルや個人情報は一切サーバーに保存されません。
      </div>

      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm no-print">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-2 rounded-lg text-white shadow-indigo-200 shadow-lg">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-800 tracking-tighter">席替えツール <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 font-bold ml-1 border">v2.0 SECURE</span></h1>
            </div>
          </div>
          <button 
            onClick={handleShuffle}
            disabled={isProcessing}
            className={`flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-100 ${isProcessing ? 'opacity-50' : ''}`}
          >
            {isProcessing ? <RefreshCcw size={16} className="animate-spin" /> : <Shuffle size={16} />}
            席替えを実行
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 pt-8 grid grid-cols-1 lg:grid-cols-4 gap-8">
        <aside className="lg:col-span-1 flex flex-col gap-6 no-print">
          <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-2 opacity-5">
              <EyeOff size={60} />
            </div>
            <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Upload size={16} className="text-indigo-500" /> 名簿インポート
            </h2>
            <div className="bg-indigo-50/50 p-3 rounded-xl border border-indigo-100 mb-4 text-[11px] text-indigo-700 font-medium leading-relaxed">
              ブラウザ内でのみデータを展開するため、情報漏洩のリスクはありません。
            </div>
            <button 
              onClick={downloadTemplate}
              className="w-full flex items-center justify-center gap-2 text-indigo-600 bg-white hover:bg-indigo-50 py-2.5 rounded-xl text-xs font-bold border border-indigo-100 transition-colors mb-4 shadow-sm"
            >
              <FileDown size={14} /> ひな形をダウンロード
            </button>
            <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:bg-slate-50 transition-all hover:border-indigo-300 group">
              <FileSpreadsheet className="text-slate-300 group-hover:text-indigo-400 mb-2 transition-colors" size={32} />
              <p className="text-xs text-slate-500 font-bold">Excelをドロップ</p>
              <p className="text-[9px] text-slate-400 mt-1">※サーバーへの送信なし</p>
              <input type="file" className="hidden" accept=".xlsx, .csv" onChange={handleFileUpload} />
            </label>
          </section>

          <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <ArrowLeftRight size={16} className="text-indigo-500" /> 手動入れ替え
            </h2>
            <div className="space-y-3">
              <div className="relative">
                <input 
                  type="text" placeholder="学籍番号1" value={swapIds.id1}
                  onChange={(e) => setSwapIds({...swapIds, id1: e.target.value})}
                  className="w-full px-4 py-3 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>
              <div className="relative">
                <input 
                  type="text" placeholder="学籍番号2" value={swapIds.id2}
                  onChange={(e) => setSwapIds({...swapIds, id2: e.target.value})}
                  className="w-full px-4 py-3 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>
              <button 
                onClick={handleManualSwap}
                className="w-full bg-slate-800 hover:bg-slate-900 text-white py-3 rounded-xl text-sm font-bold transition-all shadow-md active:scale-[0.98]"
              >
                入れ替えを実行
              </button>
            </div>
          </section>

          <section className="bg-slate-800 p-5 rounded-2xl text-white shadow-xl">
             <div className="flex items-center gap-2 mb-3">
               <Zap size={18} className="text-yellow-400" />
               <h3 className="text-sm font-bold">セキュリティ証明</h3>
             </div>
             <p className="text-[10px] text-slate-300 leading-relaxed mb-4">
               本ツールは「Local-Only Data Processing」を採用しています。全てのアルゴリズムはフロントエンド（JavaScript）で完結しており、入力された個人名や学籍番号がインターネットを介して転送されることはありません。
             </p>
             <div className="flex items-center gap-2 text-[10px] text-emerald-400 font-mono">
               <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
               Secure Environment Active
             </div>
          </section>
        </aside>

        <section className="lg:col-span-3">
          <div id="seating-grid-container" className="bg-white p-10 rounded-[2rem] border border-slate-200 shadow-xl overflow-x-auto relative">
            {isProcessing && (
              <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-20 flex items-center justify-center rounded-[2rem]">
                <div className="flex flex-col items-center gap-3">
                   <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                   <p className="text-sm font-bold text-indigo-700">セキュアに計算中...</p>
                </div>
              </div>
            )}
            
            <div className="mb-10 text-center">
              <div className="inline-block px-16 py-3 bg-slate-900 rounded-full text-white font-black uppercase tracking-[0.3em] text-xs shadow-xl">
                教 卓 (FRONT)
              </div>
            </div>

            <div className="grid grid-cols-6 gap-5 min-w-[750px]">
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

            <div className="mt-12 pt-6 border-t border-slate-100 flex flex-col gap-4 no-print">
              <div className="flex items-center justify-between text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                <div className="flex items-center gap-1.5">
                  <Info size={14} className="text-indigo-400" />
                  空席自動詰込み機能 有効 (前方優先)
                </div>
                <div>Students: {students.length} / Total: {ROWS * COLS}</div>
              </div>
              <div className="flex gap-6">
                <div className="flex items-center gap-2 text-[11px] font-bold text-indigo-600/70 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100"><Lock size={12}/> 座席固定</div>
                <div className="flex items-center gap-2 text-[11px] font-bold text-rose-600/70 bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-100"><Ban size={12}/> 使用不可</div>
              </div>
            </div>
          </div>

          <div className="mt-8 flex gap-4 no-print">
            <button 
              onClick={exportExcel}
              className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-2xl font-black transition-all shadow-lg active:scale-[0.98]"
            >
              <FileSpreadsheet size={20} /> Excelファイルをダウンロード
            </button>
          </div>
          
          <p className="mt-6 text-center text-[10px] text-slate-400 font-medium">
            ※ダウンロードされたファイルはあなたのPC内でのみ生成されます。
          </p>
        </section>
      </main>
    </div>
  );
};

export default App;
