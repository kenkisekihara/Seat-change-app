
import React, { useState, useEffect, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { 
  Shuffle, 
  ArrowLeftRight, 
  FileSpreadsheet, 
  FileText, 
  Upload, 
  RefreshCcw,
  Info,
  FileDown,
  Lock,
  Ban
} from 'lucide-react';
import { Student, Seat, Gender } from './types';
import { ROWS, COLS, DEFAULT_STUDENTS } from './constants';
import SeatCard from './components/SeatCard';

const App: React.FC = () => {
  const [students, setStudents] = useState<Student[]>(DEFAULT_STUDENTS);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [selectedSeatIndex, setSelectedSeatIndex] = useState<number | null>(null);
  const [swapIds, setSwapIds] = useState({ id1: '', id2: '' });

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

  // シャッフル（固定された座席と使用不可な座席を考慮）
  const handleShuffle = () => {
    // 1. 固定されていない、かつ使用可能な座席のインデックスを取得
    const shufflableIndices = seats.reduce((acc, seat, idx) => {
      if (!seat.isLocked && !seat.isUnusable) acc.push(idx);
      return acc;
    }, [] as number[]);

    // 2. シャッフル対象となる生徒（固定されていない座席に現在いる生徒）を取得
    const studentsToShuffle = seats
      .filter((_, idx) => shufflableIndices.includes(idx))
      .map(seat => seat.student)
      .filter((s): s is Student => s !== null);

    if (shufflableIndices.length < studentsToShuffle.length) {
      alert("使用可能な座席数が生徒数より不足しています。使用不可設定を解除してください。");
      return;
    }

    // 3. 空席も含めてシャッフル（座席数に合わせてnullで埋める）
    const shufflePool: (Student | null)[] = [...studentsToShuffle];
    while (shufflePool.length < shufflableIndices.length) {
      shufflePool.push(null);
    }
    
    const shuffledPool = shufflePool.sort(() => Math.random() - 0.5);

    // 4. 新しい状態を適用
    const newSeats = [...seats];
    shufflableIndices.forEach((seatIdx, i) => {
      newSeats[seatIdx].student = shuffledPool[i];
    });

    setSeats(newSeats);
    setSelectedSeatIndex(null);
  };

  // 座席の固定切り替え
  const handleToggleLock = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (seats[index].isUnusable) return;

    const newSeats = [...seats];
    newSeats[index].isLocked = !newSeats[index].isLocked;
    setSeats(newSeats);
    
    if (selectedSeatIndex === index) {
      setSelectedSeatIndex(null);
    }
  };

  // 使用不可（空席指定）の切り替え
  const handleToggleUnusable = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSeats = [...seats];
    const targetSeat = newSeats[index];
    
    // 使用不可にする場合、固定を解除
    if (!targetSeat.isUnusable) {
      targetSeat.isLocked = false;
      // もし生徒がいたら、一旦退避（後で再配置するか、シンプルに消す。ここではシンプルに空ける）
      targetSeat.student = null;
    }
    
    targetSeat.isUnusable = !targetSeat.isUnusable;
    setSeats(newSeats);

    if (selectedSeatIndex === index) {
      setSelectedSeatIndex(null);
    }
  };

  // 指定クリックでの選択/入れ替え
  const handleSeatClick = (index: number) => {
    // 固定されている、または使用不可な座席は選択/入れ替え対象外
    if (seats[index].isLocked || seats[index].isUnusable) {
      return;
    }

    if (selectedSeatIndex === null) {
      // 1人目の選択
      setSelectedSeatIndex(index);
    } else {
      // 2人目の選択（入れ替え実行）
      const newSeats = [...seats];
      const temp = newSeats[selectedSeatIndex].student;
      newSeats[selectedSeatIndex].student = newSeats[index].student;
      newSeats[index].student = temp;
      setSeats(newSeats);
      setSelectedSeatIndex(null);
    }
  };

  // 学籍番号指定でのスワップ
  const handleManualSwap = () => {
    const { id1, id2 } = swapIds;
    if (!id1 || !id2) return;

    const idx1 = seats.findIndex(s => s.student?.id === id1);
    const idx2 = seats.findIndex(s => s.student?.id === id2);

    if (idx1 === -1 || idx2 === -1) {
      alert("指定された学籍番号が見つかりません。");
      return;
    }

    if (seats[idx1].isLocked || seats[idx2].isLocked || seats[idx1].isUnusable || seats[idx2].isUnusable) {
      alert("固定または使用不可に設定されている座席が含まれています。設定を解除してから入れ替えてください。");
      return;
    }

    const newSeats = [...seats];
    const temp = newSeats[idx1].student;
    newSeats[idx1].student = newSeats[idx2].student;
    newSeats[idx2].student = temp;
    setSeats(newSeats);
    setSwapIds({ id1: '', id2: '' });
  };

  // ひな形ダウンロード
  const downloadTemplate = () => {
    const templateData = [
      { "学籍番号": "1001", "名前": "佐藤 健一", "選択科目": "物理", "性別": "男" },
      { "学籍番号": "1002", "名前": "田中 美咲", "選択科目": "生物", "性別": "女" }
    ];
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "名簿テンプレート");
    XLSX.writeFile(wb, "席替え名簿ひな形.xlsx");
  };

  // ファイルアップロード
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = evt.target?.result;
      const workbook = XLSX.read(data, { type: 'binary' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json(sheet) as any[];

      const importedStudents: Student[] = json.map((row: any) => ({
        id: String(row['学籍番号'] || row['id'] || ''),
        name: String(row['名前'] || row['name'] || '不明'),
        subject: String(row['選択科目'] || row['subject'] || ''),
        gender: ((row['性別'] === '女' || row['gender'] === 'female') ? '女' : '男') as Gender
      })).filter(s => s.id);

      setStudents(importedStudents);
      initializeSeats(importedStudents);
      alert(`${importedStudents.length}名のデータを読み込みました。`);
    };
    reader.readAsBinaryString(file);
  };

  // Excel出力
  const exportExcel = () => {
    const exportData = [];
    for (let r = 0; r < ROWS; r++) {
      const rowData: any = {};
      for (let c = 0; c < COLS; c++) {
        const seat = seats.find(s => s.row === r && s.col === c);
        rowData[`列${c + 1}`] = seat?.isUnusable ? "【使用不可】" : (seat?.student ? `${seat.student.name} (${seat.student.id})` : "空席");
      }
      exportData.push(rowData);
    }
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "座席表");
    XLSX.writeFile(wb, "最終座席表.xlsx");
  };

  // PDF出力
  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text("座席表 (6x7)", 14, 15);
    
    const tableData = [];
    for (let r = 0; r < ROWS; r++) {
      const rowArr = [];
      for (let c = 0; c < COLS; c++) {
        const seat = seats.find(s => s.row === r && s.col === c);
        if (seat?.isUnusable) {
          rowArr.push("---");
        } else {
          rowArr.push(seat?.student ? `${seat.student.name}\n(${seat.student.id})` : "空席");
        }
      }
      tableData.push(rowArr);
    }

    (doc as any).autoTable({
      head: [['列1', '列2', '列3', '列4', '列5', '列6']],
      body: tableData,
      startY: 20,
      styles: { font: 'helvetica', fontSize: 8 },
    });
    
    doc.save("座席表.pdf");
  };

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-2 rounded-lg text-white">
              <RefreshCcw size={20} />
            </div>
            <h1 className="text-xl font-bold tracking-tight">スマート席替え Pro</h1>
          </div>
          
          <div className="flex gap-2">
            <button 
              onClick={handleShuffle}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <Shuffle size={16} />
              ランダム席替え
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 pt-8 grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Left Sidebar */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          {/* Data Import */}
          <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Upload size={16} /> データ読み込み
            </h2>
            <div className="mb-4">
              <button 
                onClick={downloadTemplate}
                className="w-full flex items-center justify-center gap-2 text-blue-600 bg-blue-50 hover:bg-blue-100 py-2 rounded-lg text-xs font-bold border border-blue-100 transition-colors mb-4"
              >
                <FileDown size={14} />
                ひな形をダウンロード
              </button>
            </div>
            <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
              <div className="flex flex-col items-center justify-center pt-2 pb-2">
                <FileSpreadsheet className="text-slate-400 mb-2" size={24} />
                <p className="text-xs text-slate-500 font-bold">ファイルをアップロード</p>
              </div>
              <input type="file" className="hidden" accept=".xlsx, .csv" onChange={handleFileUpload} />
            </label>
          </section>

          {/* Manual Swap */}
          <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
              <ArrowLeftRight size={16} /> 座席入れ替え
            </h2>
            <div className="space-y-3">
              <input 
                type="text" 
                placeholder="学籍番号1" 
                value={swapIds.id1}
                onChange={(e) => setSwapIds({...swapIds, id1: e.target.value})}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <input 
                type="text" 
                placeholder="学籍番号2" 
                value={swapIds.id2}
                onChange={(e) => setSwapIds({...swapIds, id2: e.target.value})}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <button 
                onClick={handleManualSwap}
                className="w-full bg-slate-800 hover:bg-slate-900 text-white py-2 rounded-md text-sm font-medium transition-colors"
              >
                入れ替え実行
              </button>
            </div>
          </section>
        </div>

        {/* Center: Seating Grid */}
        <div className="lg:col-span-3">
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
            <div className="mb-8 text-center border-b pb-4">
              <div className="inline-block px-12 py-3 bg-slate-100 rounded-lg border border-slate-200 text-slate-500 font-bold uppercase tracking-widest text-sm">
                教卓 (FRONT)
              </div>
            </div>

            <div className="grid grid-cols-6 gap-4 min-w-[700px]">
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

            <div className="mt-8 flex flex-col gap-3">
              <div className="flex items-center justify-between text-slate-400 text-xs italic">
                <div className="flex items-center gap-1">
                  <Info size={14} />
                  座席をクリックして2人を選択すると入れ替えができます。
                </div>
                <div>
                  生徒数: {students.length}名 / 座席数: {ROWS * COLS}
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-2 p-2 bg-indigo-50 rounded-lg text-[11px] text-indigo-600 border border-indigo-100">
                  <Lock size={14} />
                  <span><strong>固定:</strong> 右上のカギで固定すると、シャッフル時に場所が変わりません。</span>
                </div>
                <div className="flex items-center gap-2 p-2 bg-red-50 rounded-lg text-[11px] text-red-600 border border-red-100">
                  <Ban size={14} />
                  <span><strong>空席指定:</strong> 禁止マークで座席を使用不可（空席）に設定できます。</span>
                </div>
              </div>
            </div>
          </div>

          {/* Export Options */}
          <div className="mt-8 flex gap-4">
            <button 
              onClick={exportExcel}
              className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-bold transition-all shadow-sm"
            >
              <FileSpreadsheet size={20} />
              最終結果をExcel出力
            </button>
            <button 
              onClick={exportPDF}
              className="flex-1 flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-700 text-white py-3 rounded-xl font-bold transition-all shadow-sm"
            >
              <FileText size={20} />
              座席表PDF出力
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
