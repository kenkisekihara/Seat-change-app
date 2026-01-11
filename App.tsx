
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
  EyeOff,
  Sparkles,
  Printer
} from 'lucide-react';
import { Student, Seat, Gender } from './types';
import { ROWS, COLS, DEFAULT_STUDENTS } from './constants';
import SeatCard from './components/SeatCard';
import { analyzeSeating } from './services/geminiService';

const App: React.FC = () => {
  const [students, setStudents] = useState<Student[]>(DEFAULT_STUDENTS);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [selectedSeatIndex, setSelectedSeatIndex] = useState<number | null>(null);
  const [swapIds, setSwapIds] = useState({ id1: '', id2: '' });
  const [isProcessing, setIsProcessing] = useState(false);
  const [aiAdvice, setAiAdvice] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  /**
   * 座席の初期化ロジック
   * 空席を「上（後方）」、生徒を「下（教卓側）」に集めるように配置
   */
  const initializeSeats = useCallback((studentList: Student[]) => {
    const totalSeatsCount = ROWS * COLS;
    const newSeats: Seat[] = [];

    // まず全ての座席を空席（null）で作成
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

    // 教卓に近い順（インデックスが大きい順）に生徒を配置していく
    // reversedIndices: [41, 40, 39, ..., 0]
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
    setAiAdvice(null); // 前のアドバイスを消去

    setTimeout(() => {
      // 1. 固定・不可でない座席インデックスを取得
      const targetIndices = seats.reduce((acc, seat, idx) => {
        if (!seat.isLocked && !seat.isUnusable) acc.push(idx);
        return acc;
      }, [] as number[]);

      // 2. 現在それらの座席にいる生徒を抽出
      const studentsInPlay = seats
        .filter((_, idx) => targetIndices.includes(idx))
        .map(s => s.student)
        .filter((s): s is Student => s !== null);

      if (targetIndices.length < studentsInPlay.length) {
        alert("有効な座席数が不足しています。座席のロックまたは使用不可設定を見直してください。");
        setIsProcessing(false);
        return;
      }

      // 3. 生徒をランダムに並び替え
      const shuffledStudents = [...studentsInPlay].sort(() => Math.random() - 0.5);
      const newSeats = [...seats];
      
      // 一旦対象座席をクリア
      targetIndices.forEach(idx => {
        newSeats[idx].student = null;
      });

      // 4. 空席を上側に集めるため、インデックスの大きい方（下）から生徒を詰めていく
      const fillIndices = [...targetIndices].sort((a, b) => b - a); // 降順 (41, 40, ...)
      
      shuffledStudents.forEach((student, i) => {
        const seatIdx = fillIndices[i];
        newSeats[seatIdx].student = student;
      });

      setSeats(newSeats);
      setSelectedSeatIndex(null);
      setIsProcessing(false);
    }, 600); 
  };

  const handleGetAiAdvice = async () => {
    if (students.length === 0) return;
    setIsAiLoading(true);
    const advice = await analyzeSeating(students);
    setAiAdvice(advice);
    setIsAiLoading(false);
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
      alert("該当する学籍番号の生徒が見つかりません。");
      return;
    }
    if (seats[idx1].isLocked || seats[idx2].isLocked || seats[idx1].isUnusable || seats[idx2].isUnusable) {
      alert("固定または使用不可の座席は手動でも入れ替えられません。");
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
      {/* Privacy Badge */}
      <div className="bg-indigo-900 text-indigo-100 py-2 px-4 text-center text-[10px] font-bold tracking-widest uppercase flex items-center justify-center gap-2 no-print">
        <ShieldCheck size={14} className="text-emerald-400" />
        完全ローカル実行モード: 入力された名簿データや個人情報はサーバーへ送信・保存されません
      </div>

      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm no-print">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2.5 rounded-xl text-white shadow-indigo-200 shadow-xl">
              <ShieldCheck size={22} />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-800 tracking-tighter flex items-center gap-2">
                席替えツール
                <span className="text-[10px] bg-emerald-50 text-emerald-600 border border-emerald-100 px-2 py-0.5 rounded-full font-bold">SECURE v2.5</span>
              </h1>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => window.print()}
              className="flex items-center gap-2 text-slate-600 bg-white hover:bg-slate-50 px-4 py-2.5 rounded-xl text-sm font-bold border border-slate-200 transition-all shadow-sm"
            >
              <Printer size={16} /> 印刷
            </button>
            <button 
              onClick={handleShuffle}
              disabled={isProcessing || students.length === 0}
              className={`flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl text-sm font-black transition-all shadow-lg shadow-indigo-100 active:scale-95 ${isProcessing || students.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isProcessing ? <RefreshCcw size={18} className="animate-spin" /> : <Shuffle size={18} />}
              席替え実行
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 pt-8 grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar Controls */}
        <aside className="lg:col-span-1 flex flex-col gap-6 no-print">
          {/* Data Import */}
          <section className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-3 opacity-[0.03]">
              <EyeOff size={80} />
            </div>
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Upload size={16} className="text-indigo-500" /> 名簿インポート
            </h2>
            <button 
              onClick={downloadTemplate}
              className="w-full flex items-center justify-center gap-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 py-3 rounded-2xl text-xs font-bold transition-colors mb-4 border border-indigo-100 shadow-sm"
            >
              <FileDown size={14} /> テンプレートをダウンロード
            </button>
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:bg-slate-50 transition-all hover:border-indigo-400 group">
              <FileSpreadsheet className="text-slate-300 group-hover:text-indigo-400 mb-2 transition-colors" size={32} />
              <p className="text-xs text-slate-500 font-bold">Excel/CSVをアップロード</p>
              <p className="text-[10px] text-slate-400 mt-1 font-medium">※データはブラウザ内でのみ処理</p>
              <input type="file" className="hidden" accept=".xlsx, .csv" onChange={handleFileUpload} />
            </label>
          </section>

          {/* AI Advisor */}
          <section className="bg-gradient-to-br from-indigo-600 to-indigo-800 p-6 rounded-3xl text-white shadow-xl shadow-indigo-100 relative overflow-hidden group">
            <Sparkles className="absolute -bottom-2 -right-2 text-indigo-400/20 group-hover:scale-110 transition-transform" size={100} />
            <div className="relative z-10">
              <h2 className="text-xs font-black text-indigo-200 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Sparkles size={14} /> AI配置アドバイザー
              </h2>
              <p className="text-[11px] text-indigo-100/80 leading-relaxed mb-4">
                Gemini AIが現在の名簿構成を分析し、最適な配置のヒントを提供します。
              </p>
              {aiAdvice ? (
                <div className="bg-white/10 backdrop-blur-md p-3 rounded-xl text-[11px] border border-white/20 mb-4 animate-in fade-in slide-in-from-bottom-2">
                  {aiAdvice}
                </div>
              ) : null}
              <button 
                onClick={handleGetAiAdvice}
                disabled={isAiLoading || students.length === 0}
                className="w-full bg-white text-indigo-700 hover:bg-indigo-50 py-3 rounded-xl text-xs font-black transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isAiLoading ? <RefreshCcw size={14} className="animate-spin" /> : <Sparkles size={14} />}
                分析を開始する
              </button>
            </div>
          </section>

          {/* Manual Swap */}
          <section className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <ArrowLeftRight size={16} className="text-indigo-500" /> 手動ピンポイント移動
            </h2>
            <div className="space-y-3">
              <input 
                type="text" placeholder="学籍番号1" value={swapIds.id1}
                onChange={(e) => setSwapIds({...swapIds, id1: e.target.value})}
                className="w-full px-4 py-3.5 text-sm border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
              />
              <input 
                type="text" placeholder="学籍番号2" value={swapIds.id2}
                onChange={(e) => setSwapIds({...swapIds, id2: e.target.value})}
                className="w-full px-4 py-3.5 text-sm border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
              />
              <button 
                onClick={handleManualSwap}
                disabled={students.length === 0}
                className="w-full bg-slate-800 hover:bg-slate-900 text-white py-3.5 rounded-2xl text-sm font-bold transition-all shadow-lg active:scale-95 disabled:opacity-50"
              >
                入れ替えを実行
              </button>
            </div>
          </section>
        </aside>

        {/* Seating Grid Area */}
        <section className="lg:col-span-3">
          <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-xl overflow-x-auto relative">
            {/* Loading Overlay */}
            {isProcessing && (
              <div className="absolute inset-0 bg-white/70 backdrop-blur-[4px] z-50 flex items-center justify-center rounded-[3rem]">
                <div className="flex flex-col items-center gap-4">
                   <div className="relative">
                      <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                      <ShieldCheck className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-indigo-600" size={24} />
                   </div>
                   <p className="text-sm font-black text-indigo-700 tracking-widest animate-pulse">セキュア・シャッフル実行中...</p>
                </div>
              </div>
            )}
            
            {/* Classroom Layout Header - Desk at Bottom means Grid Top is "Back" */}
            <div className="mb-8 flex items-center justify-center gap-4">
              <div className="h-[1px] flex-1 bg-slate-100"></div>
              <div className="text-[10px] font-black text-slate-300 uppercase tracking-[0.5em]">教室後方 (BACK)</div>
              <div className="h-[1px] flex-1 bg-slate-100"></div>
            </div>

            <div className="grid grid-cols-6 gap-6 min-w-[800px]">
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

            {/* Teacher's Desk at Bottom (FRONT) */}
            <div className="mt-14 mb-4 text-center">
              <div className="relative inline-block px-24 py-5 bg-slate-900 rounded-3xl text-white font-black uppercase tracking-[0.4em] text-sm shadow-2xl border-4 border-slate-800">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-slate-700 px-3 py-1 rounded-full text-[8px] font-bold text-slate-300">TEACHER</div>
                教 卓 (FRONT)
              </div>
            </div>

            {/* Legend & Stats */}
            <div className="mt-12 pt-8 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-6 no-print">
              <div className="flex flex-wrap items-center gap-5">
                <div className="flex items-center gap-2 text-[10px] font-black text-indigo-600/60 bg-indigo-50 px-4 py-2 rounded-2xl border border-indigo-100/50 shadow-sm uppercase tracking-wider">
                  <Lock size={12}/> 座席固定
                </div>
                <div className="flex items-center gap-2 text-[10px] font-black text-rose-600/60 bg-rose-50 px-4 py-2 rounded-2xl border border-rose-100/50 shadow-sm uppercase tracking-wider">
                  <Ban size={12}/> 使用不可
                </div>
                <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-200/50 shadow-sm uppercase tracking-wider">
                  <Info size={12}/> 空席は後方(上側)へ集約
                </div>
              </div>
              <div className="text-[11px] font-black text-slate-500 bg-slate-100 px-4 py-2 rounded-full border border-slate-200 uppercase tracking-widest">
                Students: <span className="text-indigo-600">{students.length}</span> / Capacity: <span className="text-slate-800">{ROWS * COLS}</span>
              </div>
            </div>
          </div>

          {/* Export Actions */}
          <div className="mt-8 flex gap-4 no-print">
            <button 
              onClick={exportExcel}
              disabled={students.length === 0}
              className={`flex-1 flex items-center justify-center gap-3 bg-emerald-600 hover:bg-emerald-700 text-white py-5 rounded-3xl font-black transition-all shadow-lg active:scale-[0.98] disabled:opacity-50`}
            >
              <FileSpreadsheet size={22} /> Excelデータとして保存
            </button>
          </div>
          
          <p className="mt-6 text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-loose">
            ※生成されたデータはブラウザの一時メモリ内でのみ保持され、ウィンドウを閉じると自動的に破棄されます。<br/>
            保存が必要な場合はExcelエクスポートまたは印刷機能をご利用ください。
          </p>
        </section>
      </main>
    </div>
  );
};

export default App;
